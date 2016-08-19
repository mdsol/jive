# -*- coding: utf-8 -*-
__author__ = 'isparks'

import jinja2
import webapp2
import os
import json
import logging
from google.appengine.ext import blobstore
from models import Game
from google.appengine.api import memcache, users, images, files
from google.appengine.ext.webapp.util import login_required
from webapp2_extras.appengine.users import admin_required
import random
from datetime import datetime
# import datetime
from google.appengine.ext import ndb
from pubnub import Pubnub
import ndbpager
from iso_3166_1 import iso_3166
from levels import getLevelInfo
import config

# integrate Google Cloud SQL
import MySQLdb
from google.appengine.api import rdbms
import base64
from google.appengine.api import urlfetch
import urllib2

import math
import time

from contextlib import closing
from google.appengine.api import rdbms

## Initiate pubnub
pubnub = Pubnub(config.pubnub_publish_key, config.pubnub_subscribe_key, False)

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader([os.path.join(os.path.dirname(__file__), 'templates')]),
    extensions=['jinja2.ext.autoescape'],
    autoescape=True)

JINJA_ENVIRONMENT.globals.update({"date": datetime.now()})
#Name that the system sends its messages under
SYSTEM_NAME = 'Capt. Mediface'

TEN_MINUTE_TIMEOUT = 600 #10 * 60 seconds. Memcache

CORRECT_ANSWERS = ["Yes", "Way to go", "Correct", "You knew it", "You're good", "You got it", "Right"]
WRONG_ANSWERS   = ["No, sorry", "Sorry", "Sorry, no"]

#Memcache object cache names
PLAYER_SCORES   = 'player_scores'
PLAYER_COUNT    = 'player_count'
ALL_PLAYER_KEYS = 'all_player_keys'
WIN_STREAKS     = 'win_streaks'


class NoPlayersLeft(Exception):
    """Thrown when there's nobody left for you to play"""
    pass

def isDevServer():
    """Is this the development server or the hosted version?"""
    return os.environ['SERVER_SOFTWARE'].startswith('Dev')


def do_not_cache(response):
    """Set headers to prevent caching"""
    response.headers["Pragma"] = "no-cache"
    response.headers.add_header("Cache-Control", "no-cache, no-store, must-revalidate, pre-check=0, post-check=0")
    response.headers.add_header("Expires", "Thu, 01 Dec 1994 16:00:00")

def isMedidata(email):
    """Is the user a medidata user?"""
    return email.endswith("@mdsol.com")


def broadcast(message):
    """
    Broadcast a message to all players via PUBNUB
    """
    #Does this synchronously but it is fast
    try:
        info = pubnub.publish({
            'channel': 'medifaces',
            'message': {
                'from': SYSTEM_NAME,
                'text': message
            }
        })

    except Exception, e:
        logging.error('Pubnub broadcast failed. Error was %s' % e.message)


def get_total_player_count():
    """Get cached total player count"""

    total_players = memcache.get(PLAYER_COUNT)
    if total_players is None:
        #Force regeneration of all players and their keys
        game = Game()
        player = game.selectOne(config.MEDIFACES_PLAYER_TBL, "COUNT(*)", "bad_avatar = 0")
        total_player = player[0]
        logging.info('Total players: {0}'.format(total_player))
    return total_player


def flush_all_players_cache():
    """Memcache to flush all player caches"""
    memcache.set(ALL_PLAYER_KEYS, None)
    memcache.set(PLAYER_COUNT, None)
    memcache.set(PLAYER_SCORES, None)

class LogoutHandler(webapp2.RedirectHandler):
    """Not directly referenced. Note that this will log you out of all Google's apps"""
    def get(self):
        url = users.create_logout_url('/')
        self.redirect(url)


class IndexHandler(webapp2.RequestHandler):
    """"Main page"""
    @login_required
    def get(self):
        user = users.get_current_user()
        email = user.email()
        logging.info("user: " + str(user))
        logging.info("email: " + str(email))

        game = Game()

        player = game.selectOneJoin("m.bad_avatar, m.registered", "j.email = {}", [email])
        if player is None:
            logging.info("couldn't find player in jive_profile table (email: '{0}')".format(email))
            self.redirect('/register')
            return

        if player[0] != 0:
            self.redirect('/badavatar')

        #logging.info(player[1])
        template_values = {'selected': 'home', 'user_registered': player[1]}

        template = JINJA_ENVIRONMENT.get_template('index.html')
        self.response.write(template.render(template_values))


class AboutHandler(webapp2.RequestHandler):
    """About page"""
    def get(self):
        template_values = {'selected': 'about'}

        template = JINJA_ENVIRONMENT.get_template('about.html')
        self.response.write(template.render(template_values))


class MustBeMedidataHandler(webapp2.RequestHandler):
    """If you are not medidata, we'll forward you here."""
    def get(self):
        user = users.get_current_user()
        if isMedidata(user.email()):
            self.redirect('/')
            return
        template_values = {}
        if user is None:
            template_values['user_email'] = 'Unknown / Not Logged In ?'
        else:
            template_values['user_email'] = user.email()

        template = JINJA_ENVIRONMENT.get_template('mustbemedidata.html')
        self.response.write(template.render(template_values))

class ProfilePictureHandler(webapp2.RequestHandler):
    """If you don't have a profile picture, we'll forward you here"""
    def get(self):
        user = users.get_current_user()
        #If not a Medidata email account
        if not isMedidata(user.email()):
            self.redirect('/medidataonly')
            return
        game = Game()
        player = game.selectOne(config.JIVE_PROFILE_TBL, "id", "`email` = {}", [user.email()])
        #if this player is in jive_profile
        if player:
            self.redirect('/')
            return

        template = JINJA_ENVIRONMENT.get_template('needprofilepicture.html')
        self.response.write(template.render())

class BadAvatarHandler(webapp2.RequestHandler):
    """If you have a bad avatar, we'll forward you here."""
    def get(self):
        user = users.get_current_user()
        email = user.email()
        game = Game()

        player = game.selectOneJoin("m.bad_avatar, m.registered", "j.email = {}", [email])

        if player is None:
            logging.info("couldn't find player in jive_profile table (email: '{0}')".format(email))
            self.redirect('/register')
            return
        if player[0] == 0:
            self.redirect('/')

        template_values = {'selected': 'about'}

        template = JINJA_ENVIRONMENT.get_template('badavatar.html')
        self.response.write(template.render(template_values))

class ScoreHandler(webapp2.RequestHandler):
    """What are the scores, George Dawes?"""
    @login_required
    def get(self):
        template_values = {'selected': 'scores'}

        #We fetch all players and put them into a single table. At the moment the
        #biggest this can be is about 1,000 players.
        game = Game()
        players = memcache.get(PLAYER_SCORES)
        if players is None:
            players = game.getUsersAllInfoRegistered()
            memcache.set(PLAYER_SCORES, players, TEN_MINUTE_TIMEOUT)
        template_values['players'] = players[:100]

        # Fetch longest run win streaks
        win_streaks = memcache.get(WIN_STREAKS)
        if win_streaks is None:
            win_streaks = game.getLongestWinStreaks()
            memcache.set(WIN_STREAKS, win_streaks, TEN_MINUTE_TIMEOUT)
        template_values['win_streaks'] = win_streaks


        #Loop through all players, add up by department and location
        locations = {}
        depts = {}
        for player in players:
            #Dept totals
            if player[2] not in depts:
                depts[player[2]] = [0,0] #[total_points, num_players]

            depts[player[2]][0] += player[5]
            depts[player[2]][1] += 1
            # logging.info(player)

            #Location totals
            if player[6] not in locations:
                locations[player[6]] = [0,0] #[total_points, num_players]

            locations[player[6]][0] += player[5]
            locations[player[6]][1] += 1

        dept_list = []
        for key in sorted(depts.keys(), key=lambda d: depts[d][0], reverse=True):
            total_points = depts[key][0]
            player_count = depts[key][1]
            try:
                avg = int(float(total_points) / float(player_count))
            except ZeroDivisionError:
                avg = 0
            avg_name = getLevelInfo(avg)[1]
            dept_list.append([key, total_points, player_count, avg, avg_name])

        location_list = []
        for key in sorted(locations.keys(), key=lambda loc: locations[loc][0], reverse=True):
            total_points = locations[key][0]
            player_count = locations[key][1]

            try:
                avg = int(float(total_points) / float(player_count))
            except ZeroDivisionError:
                avg = 0
            avg_name = getLevelInfo(avg)[1]
            location_list.append([key, total_points, player_count, avg, avg_name])

        template_values['depts'] = dept_list
        template_values['locations'] = location_list
        template = JINJA_ENVIRONMENT.get_template('scores.html')
        self.response.write(template.render(template_values))


class LetsPlayHandler(webapp2.RequestHandler):
    @login_required
    def get(self):
        template_values = {}

        template = JINJA_ENVIRONMENT.get_template('letsplay.html')
        self.response.write(template.render(template_values))

class MeHandler(webapp2.RequestHandler):
    @login_required
    def get(self):

        ret = {'selected': 'me'}

        #Do I have a player
        user = users.get_current_user()
        email = user.email()

        game = Game()
        medex_player = game.selectOneJoin("m.player_created, m.level, m.level_name, m.points, m.bad_avatar, j.fullname, j.title, j.department, j.biography, j.picture_binary, j.location, j.id, m.gender", "`j`.`email` = {} AND m.registered = '1'", [email])

        if medex_player is None:
            self.redirect('/register') #webapp2.uri_for('register')
            return
            
        ret['level'] = medex_player[1]
        ret['level_name'] = medex_player[2]
        ret['points'] = medex_player[3]
        ret['is_bad_image'] = medex_player[4]
        ret['fullname'] = medex_player[5].decode('latin-1')
        ret['title'] = medex_player[6]
        ret['department'] = medex_player[7]
        ret['biography'] = medex_player[8]
        ret['picture_src'] = medex_player[9].encode('base64').replace('\n', '')
        ret['location'] = medex_player[10]
        ret['gender'] = medex_player[12]

        ret['image_url'] = ''
        if medex_player[0] == '0000-00-00 00:00:00':
            medex_player[0] = '1970-01-01 00:00:00'

        dt = medex_player[0].strftime('%b %d, %Y')
        ret['picture_created'] = dt

        turns = game.selectAll(config.MEDIFACES_GAME_TURN_TBL, "game_state", "`jive_profile_id` = {} AND game_state IN ('L', 'W') ORDER BY played_at DESC LIMIT 20", [medex_player[11]])

        l = []
        wins = 0
        losses = 0

        for t in turns:
            if t[0] == 'W':
                l.append('1')
                wins += 1
            elif t[0] == 'L':
                l.append('-1')
                losses += 1
            else:
                l.append('0')

        last_20 = '[%s]' % ','.join(l)

        ret['last_20'] = last_20
        ret['last_20_wins'] = wins
        ret['last_20_losses'] = losses

        #We want to know how often the player was recognized.
        turns = game.selectAll(config.MEDIFACES_GAME_TURN_TBL, "game_state", "p_shown_email_id = {} AND game_state IN ('W', 'L') ORDER BY played_at DESC LIMIT 20", [medex_player[11]])

        #So how often were you recognized?
        identified = 0
        not_identified = 0
        for t in turns:
            if t[0] == 'W':
                identified += 1
            else:
                not_identified += 1

        ret['any_games']          = len(turns) != 0
        ret['identified']         = identified
        ret['not_identified']     = not_identified
        ret['total_games_tested'] = len(turns)

        #How many players have I collected?
        turns = game.selectIdentified(str(medex_player[11]))

        total_players = get_total_player_count()
        if medex_player[4] == 0:
            total_players -= 1 #-1 for me

        if turns is None:
            ret['total_wins'] = 0
        else:
            ret['total_wins'] = turns[0]
        ret['total_players'] = total_players

        #Don't cache this
        self.response.headers["Pragma"] = "no-cache"
        self.response.headers.add_header("Cache-Control",
                                         "no-cache, no-store, must-revalidate, pre-check=0, post-check=0")
        self.response.headers.add_header("Expires", "Thu, 01 Dec 1994 16:00:00")

        template = JINJA_ENVIRONMENT.get_template('me.html')
        self.response.write(template.render(ret))

    def post(self):
        """reset points/refresh image"""
        user = users.get_current_user()
        game = Game()
        this_player = game.selectOne(config.JIVE_PROFILE_TBL, "fullname, title, picture_binary, id", "`email` = {}", [user.email()])

        jsonstring = self.request.body
        jsdict = json.loads(jsonstring)

        if jsdict.get("reset-game"):
            game.deleteGameProgress(str(this_player[3]))
            base64string = base64.encodestring('{0}:{1}'.format(config.jive_username,config.jive_password))[:-1]

            name    = this_player[0]
            content = "<body><p>" + name + " just reset their game in <a href='https://medifaces-demo-1.appspot.com/' class='jive-link-community-small'>Medifaces</a></p><p></p><p><em>Posted by <a href='https://mdsol.jiveon.com/docs/DOC-14722'>ExpressBot</a>​</em></p></body>"
            data    = json.dumps({"visibility": "place", "parent": config.jive_placeUrl + "/"+ str(config.jive_medifaces_space), "type":"update", "content":{ "type":"text/html", "text":content}})

            result  = urlfetch.fetch(method=urlfetch.POST, url=config.jive_contentUrl, deadline=15, headers={"X-Jive-Run-As": "email " + user.email(), 'Authorization': 'Basic ' + base64string, "Content-Type": "application/json"}, payload=data).content
            broadcast('%s just reset their game!' % user.email())
            ret = {"result": "Game progress successfully reset"}
        elif jsdict.get("refresh-img"):
            ret = self.refreshPhoto(this_player, user.email(), game)
        elif jsdict.get("gender"):
            gender = jsdict.get("gender")
            ret = self.changeGender(this_player, user.email(), game, gender)
        else:
            logging.error("POST request without correct data")
            ret = {"error": "Something went wrong. Sorry about that. Try reloading this page."}

        self.response.write(json.dumps(ret))

    def changeGender(self, this_player, email, game, gender):
        """gets user's photo from Jive"""

        logging.error(gender)
        if gender == "male":
            gender = 1
        elif gender == "female":
            gender = 2
        else:
            gender = 0

        med_player = game.selectOne(config.MEDIFACES_PLAYER_TBL, "id", "`jive_profile_id` = {}", [this_player[3]])
        game.update(config.MEDIFACES_PLAYER_TBL, {"gender": gender}, "id = {}", [med_player[0]])

        return { "result": "Gender changed" }

    def refreshPhoto(self, this_player, email, game):
        """gets user's photo from Jive"""
        uri = "https://mdsol.jiveon.com/api/core/v3/people/email/" + email
        base64string = base64.encodestring('{0}:{1}'.format(config.jive_username,config.jive_password))[:-1]
        result = urlfetch.fetch(url=uri, deadline=15, headers={'Authorization': 'Basic ' + base64string}).content
        dic = json.loads( result[result.find('{'):] )
        
        try:
            img_url = dic['photos'][0]['value']
        except KeyError:
            return {"error": "Couldn't find your profile picture in Medidata Express. Please upload one and try again!"}

        new_img_binary = urlfetch.fetch(url=img_url, headers={'Authorization': 'Basic ' + base64string}).content
        try:
            old_img_binary = game.selectOne(config.JIVE_PROFILE_TBL, "picture_binary", "id = {}", [this_player[3]])[0]

        except TypeError: # if user has uploaded an image for the first time, get all info
            values = {"fullname":           dic["displayName"],
                      "email":              email,
                      "biography":          "",
                      "location":           dic["location"],
                      "picture_name":       email.split("@")[0]+".png",
                      "picture_updated":    time.strftime("%Y-%m-%d %H:%M:%S"),
                      "picture_binary":     new_img_binary
                      }

            for info in dic["jive"]["profile"]:
                if info["jive_label"] == "Title":
                    values["title"] = info["value"]
                elif info["jive_label"] == "Department":
                    values["department"] = info["value"]
                elif info["jive_label"] == "Biography":
                    values["biography"] = info["value"]
                elif info["jive_label"] == "Hire Date":
                    hire_date_list = info["value"].split("/")
                    values["hire_date"] = "{2}-{0}-{1} 00:00:00".format(*hire_date_list)

            jive_profile_id = game.insert(config.JIVE_PROFILE_TBL, values)

            values = {"jive_profile_id":jive_profile_id,
                      "player_created": time.strftime("%Y-%m-%d %H:%M:%S")
                     }
            game.insert(config.MEDIFACES_PLAYER_TBL, values)
            return {"result": "Picture updated successfully"}

        if old_img_binary == new_img_binary:
            return {"error": "Your Medidata Express profile picture hasn't changed. Please check to make sure you've uploaded a new one."}
        else:
            game.update(config.JIVE_PROFILE_TBL, {"picture_binary": new_img_binary}, "id = {}", [this_player[3]])
            game.update(config.MEDIFACES_PLAYER_TBL, {"bad_avatar": 0}, "jive_profile_id = {}", [this_player[3]])
            return {"result": "Picture updated successfully"}

class PlayHandler(webapp2.RequestHandler):
    """Handler that deals with serving up plays"""
    @login_required
    def get(self):
        user = users.get_current_user()
        game = Game()

        medex_player = game.selectOneJoin("m.bad_avatar", "`j`.`email` = {} AND m.registered = '1'", [user.email()])
        departments = [row[0] for row in game.selectAll(config.JIVE_PROFILE_TBL, "department", distinct=True)]
        locations = [row[0] for row in game.selectAll(config.JIVE_PROFILE_TBL, "location", "location NOT LIKE 'Remote%' AND location NOT IN ('C3i','Paradigm')", distinct=True)]
        departments.sort()
        locations.sort()
        
        if medex_player is None:
            self.redirect('/register')
            return
        elif medex_player[0] != 0:
            self.redirect('/badavatar')
            return

        this_player = game.selectOne(config.JIVE_PROFILE_TBL, "fullname, title, picture_binary, id", "`email` = {}", [user.email()])
        t_player = { 'fullname': this_player[0].decode('latin-1'), 'title': this_player[1], 'picture_src': this_player[2].encode('base64').replace('\n', '')}

        template_values = dict(selected='play',
                               this_player=t_player,
                               player_level=game.getLevel(user.email()), #level, name, progress
                               departments=departments,
                               locations=locations,
                               pubnub_publish_key=config.pubnub_publish_key,
                               pubnub_subscribe_key=config.pubnub_subscribe_key
        )

        #Get a game to play
        try:
            turn_data = self.getNewTurnForUser(str(this_player[3]), {"department": "All", "location": "All"})        
            turn_data["no_players_left"] = False
            logging.info(turn_data)

            template_values.update(turn_data)

        except NoPlayersLeft:
            logging.info('No players left')
            template_values['no_players_left'] = True

        template = JINJA_ENVIRONMENT.get_template('play.html')
        self.response.write(template.render(template_values))

    def uescape(self, text):
        print repr(text)
        escaped_chars = []
        for c in text:
            if (ord(c) < 32) or (ord(c) > 126):
                c = '&{};'.format(htmlentitydefs.codepoint2name[ord(c)])
            escaped_chars.append(c)
        return ''.join(escaped_chars)

    def getNewTurnForUser(self, jive_profile_id, filtr):
        """
        Get a new new turn object for the user. It's always the logged in user.

        We use ancestor queries to tie all turn attempts to the user so that we
        can make their turn attempts strongly consistent.
        """
        # 1. Find a user that never played before by this user
        game = Game()

        query = "SELECT p_shown_email_id FROM " + config.MEDIFACES_GAME_TURN_TBL + " where jive_profile_id = {} AND game_state != 'N'"
        query_inter = [jive_profile_id]
        logging.info(query)

        filtr_query = ""
        filtr_query_inter = []
        # in case location and department don't show up in filtr
        if filtr.get("location") is None and filtr.get("department") is None:
            logging.info("WARNING: location and department not found in filtr")

        # add location to filtr_query if location is not "All"
        if filtr.get("location") != "All":
            if filtr.get("location") == "Remote":
                filtr_query += " AND location like 'Remote%'" #only remote employees
            elif filtr.get("location") == "Other":
                filtr_query += " AND location in ('Paradigm','C3i')" #only Paradigm or C3i employees
            else:
                filtr_query += " AND location = {}" #only employees in specified location
                filtr_query_inter.append(filtr.get("location"))

        # add department to filtr_query if department is not "All"
        if filtr.get("department") != "All":
            filtr_query += " AND department = {}" # only employees in specified department
            filtr_query_inter.append(filtr.get("department"))

        # select one random player you haven't seen before, not including yourself, and return the [id, fullname, title, picture_binary, gender]
        player = game.selectOneJoin("j.id, j.fullname, j.title, j.picture_binary, m.gender", "j.id NOT IN (" + query + ") AND j.id != {} AND m.bad_avatar='0'" + filtr_query + " ORDER BY RAND()", query_inter + [jive_profile_id] + filtr_query_inter)

        # if there are no players you haven't seen at least once, find one you haven't answered correctly yet
        if player is None:
            query += " AND game_state != 'L'"
            player = game.selectOneJoin("j.id, j.fullname, j.title, j.picture_binary, m.gender", "j.id NOT IN (" + query + ") AND j.id != {} AND m.bad_avatar='0'" + filtr_query + " ORDER BY RAND()", query_inter + [jive_profile_id] + filtr_query_inter)
            # no players with these filters
            if player is None:
                raise NoPlayersLeft("No players you haven't seen yet in this category.")

        gender = player[4]

        where = ""
        where_inter = []
        if gender != 0:
            where = " AND gender = {}"
            where_inter.append(gender)

        # pick up 4 other players to add in the game.
        other_players = game.selectJoin("j.id, j.fullname, j.title", "j.id NOT IN ({},{})"+where+filtr_query+" ORDER BY RAND() LIMIT 4", [str(player[0]), jive_profile_id] + where_inter + filtr_query_inter)

        # if there aren't 4 other players with matching gender + filtr, try getting more people using only gender
        if len(other_players) < 4:
            player_ids = [player[0], jive_profile_id] + [row[0] for row in other_players]
            other_players += game.selectJoin("j.id, j.fullname, j.title", "j.id NOT IN (" + ",".join(["{}"] * len(player_ids)) + ")"+where+" ORDER BY RAND()", player_ids + where_inter, limit=4-len(other_players))

        # finally, just choose people regardless of their category
        if len(other_players) < 4:
            player_ids = [player[0], jive_profile_id] + [row[0] for row in other_players]
            other_players += game.selectAll(config.JIVE_PROFILE_TBL, "id, fullname, title", "`id` NOT IN (" + ",".join(["{}"] * len(player_ids)) + ")" + " ORDER BY RAND() LIMIT " + str(4-len(other_players)), player_ids)

        logging.info(player)
        logging.info(other_players)
        picked_players = [player[:3]] + list(other_players)
        random.shuffle(picked_players)

        values = {
            'jive_profile_id': jive_profile_id,
            'game_state' : 'N',
            'p_shown_email_id' : str(player[0]),
        }
        logging.info(picked_players)
        for i in range(len(picked_players)):
          values['p%s_email_id' % (i+1)] = picked_players[i][0]

        #logging.info(values)
        new_game_turn_id = game.insert(config.MEDIFACES_GAME_TURN_TBL, values)
        logging.info(new_game_turn_id)

        turn_data = {}
        turn_data["id"] = new_game_turn_id
        turn_data["image_url"] = player[3].encode('base64').replace('\n', '')
        turn_data["players"] = [ {"id": row[0], "name": row[1], "title": row[2]} for row in picked_players]

        logging.info(turn_data)
        return turn_data

    def post(self):
        """Take a users answer, validate it and provide them with the next question"""

        #Check logged in
        user = users.get_current_user()
        if not user:
            self.response.write(json.dumps(dict(error="Dude, you gotta be logged in! Try reloading this page.")))
            return

        # this_player = Player.query(Player.email == user.email()).get()
        game = Game()

        this_player = game.selectOne(config.JIVE_PROFILE_TBL, "fullname, title, picture_binary, email, id", "`email` = {}", [user.email()])
        if this_player is None:
            logging.info("couldn't find player in jive_profile table (email: '{0}')".format(user.email()))
            self.response.write(json.dumps({"result":"refresh"}))
            return

        #Get the json passed from the client page
        jsonstring = self.request.body
        jsdict = json.loads(jsonstring)

        if 'filterchange' not in jsdict:
            logging.info("choice picked");
            ret = self.choice_picked(game, this_player, jsdict)
        else:
            logging.info("new filter");
            ret = self.new_filter(game, this_player, jsdict)
            
        self.response.write(json.dumps(ret))

    def choice_picked(self, game, this_player, jsdict):
        email = this_player[3]
        jive_profile_id = str(this_player[4])

        #Get the value passed
        game_turn_id = jsdict.get('id')

        player_guess_id = jsdict.get('player_guess_id')

        game_turn        = game.selectOne(config.MEDIFACES_GAME_TURN_TBL, "game_state, p_shown_email_id ", " id = {}", [game_turn_id])
        if game_turn is None:
            ret = {"error": "This is an old turn! You've reset your game in another tab or window. Please refresh the page to get a new turn!"}
            return ret

        p_shown_email_id = str(game_turn[1])
        correct_player   = game.selectOne(config.JIVE_PROFILE_TBL, "fullname, email, location, picture_updated, picture_binary, department, hire_date, title", "`id` = {}", [p_shown_email_id])

        this_player_med = game.selectOne(config.MEDIFACES_PLAYER_TBL, "level, level_name, points, bad_avatar", "`jive_profile_id` = {}", [p_shown_email_id])
        current_mediface_player = game.selectOne(config.MEDIFACES_PLAYER_TBL, "level, level_name, points, bad_avatar", "`jive_profile_id` = {}", [jive_profile_id])

        ret = {}

        logging.info('correct_player: ' + correct_player[1])
        logging.info('current medifaces player: ' + this_player[0])
        # if the player is not in MEDIFACES_PLAYER_TBL inset in db
        if this_player_med is None:
            if correct_player != 'None':
                values = {'jive_profile_id': player_guess_id, 'exemployee' : int(0), 'avatar_updated' : correct_player[3], 'level': 0, 'points': 0, 'bad_avatar': 0 }
                # insert in Cloud SQL
                new_player_id = game.insert(config.MEDIFACES_PLAYER_TBL, values)
                this_player_med = game.selectOne(config.MEDIFACES_PLAYER_TBL, "level, level_name, points, bad_avatar", "`id` = {}", [new_player_id])

        #Did they answer the question?
        # if (answer not in ['p1', 'p2', 'p3', 'p4', 'toxic']) or (game_turn_id is None):
        if game_turn_id is None:
            # logging.info('Answer provided was %s' % answer)
            # logging.info('JSON received was %s' % jsonstring)
            ret['error'] = "Sorry. I didn't understand that response."
            return ret

        if game_turn is 'None':
            ret['error'] = "Sorry. I didn't get a turn ID I recognized."
            return ret

        if game_turn[0] != 'N':
            ret['error'] = "Sorry. You already played that turn. Refresh page to get another.."
            return ret

        #Who was it, actually?
        update_game_state = ''
        # Deal with toxic players
        if player_guess_id == 'toxic':
            ret["result"] = "Thanks for reporting this bad image. You won't see this player again until they fix their image."
            update_game_state = 'T'

            where  = "`jive_profile_id` = {}"
            where_inter = [p_shown_email_id]

            game.update(config.MEDIFACES_PLAYER_TBL, {"bad_avatar": 1}, where, where_inter)

        else:            
            #Did the p selected match the answer_player
            selected = player_guess_id

            played_at = ''
            #What was the answer
            if player_guess_id == p_shown_email_id:

                update_game_state = 'W'

                prefix = random.choice(CORRECT_ANSWERS)

                add_points = 1

                points = current_mediface_player[2] + add_points


                ret['add_points'] = add_points

                fields = {"points": points}

                where  = "`jive_profile_id` = {}"
                where_inter = [jive_profile_id]

                game.update(config.MEDIFACES_PLAYER_TBL, fields, where, where_inter)
            else:
                prefix = random.choice(WRONG_ANSWERS)
                update_game_state = 'L'

            # popover_html must use single quotes because the outer content uses double quotes
            popover_html = """
                <table class='table table-condensed table-striped' style='color: #000;font-size: 16px;'>
                    <tr> <td>Title:</td> <td>{3}</td> </tr>
                    <tr> <td>Location:</td> <td>{0}</td> </tr>
                    <tr> <td>Department:</td> <td>{1}</td> </tr>
                    <tr> <td>Hire Date:</td> <td>{2}</td> </tr>
                    <tr> <td style='text-align:center;' colspan='2'>
                        <a href='https://mdsol.jiveon.com/people/{4}' target='new'>
                        Medidata Express Profile</a></td></tr>
                </table>
            """.format(correct_player[2], correct_player[5], correct_player[6].strftime("%b %d, %Y"),
                       correct_player[7], correct_player[1])
            
            ret['result'] = """
                {0}. This is <a id="p_shown_link" href="#" onclick="return false;" data-content="{2}">{1}</a>
            """.format(prefix, unicode(correct_player[0], 'latin-1').encode('utf-8'), popover_html)

        latest_level, latest_levelname, latest_pctdone = game.getLevel(email) #level, level name, pct done
        ret['player_level'] = (latest_level, latest_levelname, latest_pctdone)

        #Win or a loss?
        ret['state'] = update_game_state
        played_at = time.strftime('%Y-%m-%d %H:%M:%S')
        fields = {"game_state": update_game_state, "played_at": played_at}
        where  = "`id` = {}"
        where_inter = [game_turn_id]
        game.update(config.MEDIFACES_GAME_TURN_TBL, fields, where, where_inter)

        if latest_level != current_mediface_player[0]:
            fields = {"level": latest_level, "level_name": latest_levelname}

            where  = "`jive_profile_id` = {}"
            where_inter = [jive_profile_id]

            game.update(config.MEDIFACES_PLAYER_TBL, fields, where, where_inter)

            ret['level_up'] = True
            # spoofing in users data
            base64string = base64.encodestring('{0}:{1}'.format(config.jive_username,config.jive_password))[:-1]

            name    = this_player[0]
            email   = this_player[3]
            content = "<body> " + name + " reached level " + str(latest_level) + " (<strong>"+latest_levelname+"</strong>) in <a href='https://medifaces-demo-1.appspot.com/' class='jive-link-community-small'>Medifaces</a><p></p><p><em>Posted by <a href='https://mdsol.jiveon.com/docs/DOC-14722'>ExpressBot</a>​</em></p></body>"
            data    = json.dumps({"visibility": "place", "parent": config.jive_placeUrl + "/"+ str(config.jive_medifaces_space), "type":"update", "content":{ "type":"text/html", "text":content}})
            result  = urlfetch.fetch(method=urlfetch.POST, url=config.jive_contentUrl, deadline=15, headers={"X-Jive-Run-As": "email " + email, 'Authorization': 'Basic ' + base64string, "Content-Type": "application/json"}, payload=data).content
            broadcast('%s has achieved level %d' % (this_player[0], latest_level))
        else:
            ret['level_up'] = False

        #We need a new turn here... Get everything we need
        try:
            turn_data = self.getNewTurnForUser(jive_profile_id, jsdict.get("filter"))

        except NoPlayersLeft:
            ret['no_players_left'] = True
            return ret

        ret.update(turn_data)

        return ret

    def new_filter(self, game, this_player, jsdict):
        email = this_player[3]
        jive_profile_id = str(this_player[4])

        ret = {}

        #Get the value passed
        game_turn_id = jsdict.get('id')

        current_mediface_player = game.selectOne(config.MEDIFACES_PLAYER_TBL, "level, level_name, points, bad_avatar", "`jive_profile_id` = {}", [jive_profile_id])


        latest_level, latest_levelname, latest_pctdone = game.getLevel(email)#level, level name, pct done
        ret['player_level'] = (latest_level, latest_levelname, latest_pctdone)

        if game_turn_id is not None:
            game.deleteRowById(config.MEDIFACES_GAME_TURN_TBL, game_turn_id)
            game_turn = game.selectOne(config.MEDIFACES_GAME_TURN_TBL, "game_state, p_shown_email_id ", " id = {}", [game_turn_id])

        #We need a new turn here... Get everything we need
        try:
            turn_data = self.getNewTurnForUser(jive_profile_id, jsdict.get("filter"))
            turn_data["result"] = "filterchange"

        except NoPlayersLeft:
            ret['no_players_left'] = True
            return ret

        ret.update(turn_data)

        #logging.info(ret)
        return ret

class RegisterUserHandler(webapp2.RequestHandler):
    """Registers new users."""
    @login_required
    def get(self):

        errors = []

        user = users.get_current_user()
        if not user:
            logging.error('Post when not logged in!')
            self.abort(500)

        email = user.email()
        try:
            country_code = self.request.headers["X-AppEngine-Country"]
        except KeyError:
            country_code = '?'

        logging.info(email)
        if not isMedidata(email):
            self.redirect('/medidataonly')
            return

        game = Game()
        player = game.selectOneJoin("j.id, j.fullname, m.registered", "`email` = {}", [email])

        if player is None:
            self.redirect('/needprofilepicture')
        elif player[2] == 1:
            self.redirect('/')
        else:
            where  = "`jive_profile_id` = {}"
            where_inter = [player[0]]

            game.update(config.MEDIFACES_PLAYER_TBL, {"registered": 1}, where, where_inter)

            # spoofing in users data
            base64string = base64.encodestring('{0}:{1}'.format(config.jive_username,config.jive_password))[:-1]
            name    = player[1]
            content = "<body><p>" + name + " just signed up in <a href='https://medifaces-demo-1.appspot.com/' class='jive-link-community-small'>Medifaces</a></p><p></p><p><em>Posted by <a href='https://mdsol.jiveon.com/docs/DOC-14722'>ExpressBot</a>​</em></p></body>"
            data    = json.dumps({"visibility": "place", "parent": config.jive_placeUrl + "/"+ str(config.jive_medifaces_space), "type":"update", "content":{ "type":"text/html", "text":content}})
            result  = urlfetch.fetch(method=urlfetch.POST, url=config.jive_contentUrl, deadline=15, headers={"X-Jive-Run-As": "email " + email, 'Authorization': 'Basic ' + base64string, "Content-Type": "application/json"}, payload=data).content

            # spoofing in users data
            base64string = base64.encodestring('{0}:{1}'.format(config.jive_username,config.jive_password))[:-1]
            # curl -v -u dpuscau@mdsol.com:dpuscau@mdsol.com -k --header "Content-Type: application/json" -d '{"visibility":"place", "parent":"https://mdsol-sandbox.jiveon.com/api/core/v3/places/41156", "type":"document", "subject":"My place document", "content":{"type":"text/html","text":"<body><p>Test of document in a place</p></body>"} }' "https://mdsol-sandbox.jiveon.com/api/core/v3/contents"
            name    = player[1]
            content = "<body><p>" + name + " just signed up in <a href='https://medex-faces.appspot.com' class='jive-link-community-small'>Medifaces</a></p><p></p><p><em>Posted by <a href='https://mdsol.jiveon.com/docs/DOC-14722'>ExpressBot</a>​</em></p></body>";
            data    = json.dumps({"visibility": "place", "parent": config.jive_placeUrl + "/"+ str(config.jive_medifaces_space), "type":"update", "content":{ "type":"text/html", "text":content}});
            result  = urlfetch.fetch(method=urlfetch.POST, url=config.jive_contentUrl, deadline=15, headers={"X-Jive-Run-As": "email " + email, 'Authorization': 'Basic ' + base64string, "Content-Type": "application/json"}, payload=data).content

            #Send a broadcast that we have a new player
            broadcast('%s just signed up!' % email)
            #Gotta flush the all_players cache
            flush_all_players_cache()
            self.redirect("/letsplay")   

class ReviewHandler(webapp2.RequestHandler):
    """Handler that deals with serving up review mode"""
    @login_required
    def get(self):
        user = users.get_current_user()
        game = Game()

        medex_player = game.selectOneJoin("m.bad_avatar", "`j`.`email` = {} AND m.registered = '1'", [user.email()])
        
        if medex_player is None:
            self.redirect('/register')
            return
        elif medex_player[0] != 0:
            self.redirect('/badavatar')
            return

        #Get user's info
        this_player = game.selectOne(config.JIVE_PROFILE_TBL, "fullname, title, picture_binary, id", "`email` = {}", [user.email()])
        t_player = { 'fullname': this_player[0].decode('latin-1'), 'title': this_player[1], 'picture_src': this_player[2].encode('base64').replace('\n', '')}

        departments = [row[0] for row in game.selectAll(config.JIVE_PROFILE_TBL, "department", distinct=True)]
        locations = [row[0] for row in game.selectAll(config.JIVE_PROFILE_TBL, "location", "location NOT LIKE 'Remote%' AND location NOT IN ('C3i','Paradigm')", distinct=True)]
        departments.sort()
        locations.sort()

        template_values = dict(selected='review',
                               this_player=t_player,
                               player_level=game.getLevel(user.email()), #level, name, progress
                               departments=departments,
                               locations=locations,
                               pubnub_publish_key=config.pubnub_publish_key,
                               pubnub_subscribe_key=config.pubnub_subscribe_key
        )

        #Get a flashcard
        try:
            player_info = self.getNewCardForUser(str(this_player[3]), {"department": "All", "location": "All"})
            picture_url = player_info[2].encode('base64').replace('\n', '')

            template_values.update(dict(
                picture_url = picture_url,
                player_id = player_info[3],
                answer = "{0}, {1}".format(player_info[0], player_info[1])
            ))

        except NoPlayersLeft:
            logging.info('error')
            template_values['no_players_left'] = True

        template = JINJA_ENVIRONMENT.get_template('review.html')
        self.response.write(template.render(template_values))

    def post(self):
        game = Game()

        #Check logged in
        user = users.get_current_user()
        if not user:
            self.response.write(json.dumps(dict(error="Dude, you gotta be logged in! Try reloading this page.")))
            return

        this_player = game.selectOne(config.JIVE_PROFILE_TBL, "fullname, title, picture_binary, id", "`email` = {}", [user.email()])
        if this_player is None:
            logging.info("couldn't find player in jive_profile table (email: '{0}')".format(email))
            self.response.write(json.dumps({"result":"refresh"}))
            return

        #Get the json passed from the client page
        jsonstring = self.request.body
        jsdict = json.loads(jsonstring)

        if 'filterchange' not in jsdict:
            ret = self.choice_picked(game, this_player, jsdict)
        else:
            ret = self.new_filter(game, this_player, jsdict)
            
        self.response.write(json.dumps(ret))

    def getNewCardForUser(self, jive_profile_id, filtr):
        """ Get a new "flashcard" for the user"""
        game = Game()

        #all players you've already correctly identified enough times
        done_players = "SELECT p_shown_id FROM " + config.MEDIFACES_REVIEW_TBL + " WHERE jive_profile_id = {} and done = TRUE"
        done_players_inter = [jive_profile_id]

        filtr_query = ""
        # in case location and department don't show up in filtr
        if filtr.get("location") is None and filtr.get("department") is None:
            logging.info("WARNING: location and department not found in filtr")
            filtr["location"] = "All"
            filtr["department"] = "All"

        filtr_query_inter = []
        # add location to filtr_query if location is not "All"
        if filtr.get("location") != "All":
            if filtr.get("location") == "Remote":
                filtr_query += " AND location like 'Remote%'" #only remote employees
            elif filtr.get("location") == "Other":
                filtr_query += " AND location in ('Paradigm','C3i')" #only Paradigm or C3i employees
            else:
                filtr_query += " AND location = {}" #only employees in specified location
                filtr_query_inter.append(filtr.get("location"))

        # add department to filtr_query if department is not "All"
        if filtr.get("department") != "All":
            filtr_query += " AND department = {}" # only employees in specified department
            filtr_query_inter.append(filtr.get("department"))

        logging.info(filtr_query)
        
        done_str = ""
        if done_players:
            done_str = "j.id NOT IN (" + ",".join(["{}"] * len(done_players)) + ") AND"
        #info of a random player not in query and not yourself and has a good avatar
        player_info = game.selectOneJoin("j.fullname, j.title, j.picture_binary, j.id", "j.id NOT IN (" + done_players + ") AND j.id != {} AND m.bad_avatar='0'" + filtr_query + " ORDER BY RAND()", done_players_inter + [jive_profile_id] + filtr_query_inter)
        if player_info is None:
            raise NoPlayersLeft("No players you haven't seen yet in this category.")
        return player_info

    def choice_picked(self, game, this_player, jsdict):
        """mark right/wrong answer in database and send new card"""
        jive_profile_id = str(this_player[3])

        if jsdict.get("choice") == "toxic":
            ret = {"result": "Thanks for reporting this bad image. You won't see this player again until they fix their image."}

            where  = "`jive_profile_id` = {}"
            where_inter = [jsdict.get("player_id")]

            game.update(config.MEDIFACES_PLAYER_TBL, {"bad_avatar": 1}, where, where_inter)
        else:
            # update table here
            player_id = jsdict.get("player_id")
            col = jsdict.get("choice")
            if col != "known" and col != "unknown":
                logging.error("ERROR: choice was '{0}', not known/unknown".format(col))
            else:
                row = game.selectOne(config.MEDIFACES_REVIEW_TBL, "id, known, unknown", "jive_profile_id = {} AND p_shown_id = {}", [jive_profile_id, player_id])
                if row is None:
                    #fields = ("created","updated","jive_profile_id", "p_shown_id", col)
                    #need yyyyMMdd
                    #values = {"created": "NOW()","updated": "NOW()","jive_profile_id": jive_profile_id, "p_shown_id": player_id, "col": 1}
                    values = {"jive_profile_id": jive_profile_id, "p_shown_id": player_id, col: 1}
                    game.insert(config.MEDIFACES_REVIEW_TBL, values)
                else:
                    if col == "known" and ((row[1] >= 1 and row[2] == 0) or (row[1] >= row[2] * 2)):
                        update_query = {"done": True}
                    else:
                        if col == "known":
                            update_query = {col: row[1]+1}
                        elif  col == "unknown":
                            update_query = {col: row[2]+1}
                        #set column 
                    game.update(config.MEDIFACES_REVIEW_TBL, update_query, "id = {}", [row[0]])

            ret = {"result" : col}
            logging.info(jsdict.get("choice"))

        #Get a game to play
        try:
            player_info = self.getNewCardForUser(jive_profile_id, jsdict.get("filter"))
            image_url = player_info[2].encode('base64').replace('\n', '')

            ret.update(dict(
                image_url = image_url,
                player_id = player_info[3],
                answer = "{0}, {1}".format(player_info[0], player_info[1])
            ))

        except NoPlayersLeft:
            ret['no_players_left'] = True

        return ret

    def new_filter(self, game, this_player, jsdict):
        """change category of players shown"""

        ret = {'result' : "filterchange"}

        jive_profile_id = str(this_player[3])

        #Get a game to play
        try:
            player_info = self.getNewCardForUser(jive_profile_id, jsdict.get("filter"))
            image_url = player_info[2].encode('base64').replace('\n', '')

            ret.update(dict(
                image_url = image_url,
                player_id = player_info[3],
                answer = "{0}, {1}".format(player_info[0], player_info[1])
            ))

        except NoPlayersLeft:
            ret['no_players_left'] = True

        return ret
