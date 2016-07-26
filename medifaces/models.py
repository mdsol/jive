__author__ = 'isparks'

from google.appengine.ext import ndb
from levels import getLevelInfo, DEFAULT_LEVEL_NAME
from iso_3166_1 import iso_3166
import MySQLdb
import logging
import time
import datetime
import os

import config

if (os.getenv('SERVER_SOFTWARE') and
        os.getenv('SERVER_SOFTWARE').startswith('Google App Engine/')):
    try:
        db = MySQLdb.connect(unix_socket='/cloudsql/' + config._INSTANCE_NAME, db=config._MYSQL_DB, user=config._MYSQL_USER)
        db.ping(True)
    except OperationalError as e:
        if 'MySQL server has gone away' in str(e):
            #do what you want to do on the error 
            logging.info('MySQL server has gone away')
            reconnect()
            print e
        else:
            raise e()
else:
    db = MySQLdb.connect(host=config._MYSQL_HOST, port=config._MYSQL_PORT, db=config._MYSQL_DB, user=config._MYSQL_USER, passwd=config._MYSQL_PASS)

class Game():
    def insert(self, table, values):
        """Insert the given values into the table.

        - table is the name of the SQL table.
        - values is a dictionary representing a {column: value} mapping of the
          data for the inserted row.
        """

        fields = values.keys()
        types = ["%(" + key + ")s" for key in fields]
        insert = "INSERT INTO %s (%s) VALUES (%s)" % (table,','.join(fields), ','.join(types))
        # logging.info('insert: '+insert)

        cursor = db.cursor()
        cursor.execute(insert, values)
        db.commit()
        cursor.close()

        if cursor.lastrowid:
            return cursor.lastrowid
        else:
            return 0

    def update(self, table, values, where = None, where_inter = []):
        """Update the given values in the table for the rows that match the
        where query.

        -   table is the name of the SQL table.
        -   values is a dictionary representing a {column: value} mapping of the
            data for the inserted row.
        -   where is the WHERE query to filter rows by. If there is any data
            that needs to be escaped, its placement should be marked with a set
            of empty curly braces {} and the data should be given in the
            where_inter list.
        -   where_inter is the list of data that should be interpolated into
            the WHERE query string. Each element should be given in the same
            order as its corresponding %s marker in where.
        """

        set_list = [key + "=%(" + key + ")s" for key in values]

        query = "UPDATE %s SET %s" % (table, ",".join(set_list))
        if where is not None:
            query += " WHERE "
            if not where_inter:
                query += where
            else:
                where_keys = []
                i = 0
                while len(where_keys) < len(where_inter):
                    key = str(i) 
                    if key not in values:
                        where_keys.append(key)
                    i += 1
                where = where.replace("%", "%%")
                query += where.format( *["%(" + key + ")s" for key in where_keys] )
                values.update({where_keys[i]: where_inter[i] for i in range(len(where_inter))})

        #logging.info('update: '+query+'values: '+str(values))
        cursor = db.cursor()
        cursor.execute(query, values)
        db.commit()
        cursor.close()

    def selectAll(self, table, fields, where = None, where_inter = [], distinct = False, limit = None):
        """Select the given fields for the rows that match the where query.

        -   table is the name of the SQL table.
        -   fields is a comma-separated string of the fields you wish to return
            or "*" if you want to return all fields.
        -   where is the WHERE query to filter rows by. If there is any data
            that needs to be escaped, its placement should be marked with a set
            of empty curly braces {} and the data should be given in the
            where_inter list.
        -   where_inter is the list of data that should be interpolated into
            the WHERE query string. Each element should be given in the same
            order as its corresponding {} marker in where.
        -   distinct determines whether or not to add "distinct" to the select
            query. By default, it is False.
        -   limit is an optional integer parameter that represents the number
            of rows the query result should be limited to. Note that fewer rows
            may be returned if the query results in a smaller number of rows
            than the limit. If limit is not given, all rows resulting from the
            query will be returned.
        """

        query = "SELECT"
        if distinct:
            query += " distinct"
        query += " %s FROM %s" % (fields, table)
        # logging.info('selectAll: '+query)
        
        values = {}
        if where is not None:
            query += " WHERE "
            where = where.replace("%", "%%") # escape % symbols
            keys = range(len(where_inter))
            query += where.format( *["%(" + str(i) + ")s" for i in keys] )
            values = {str(i): where_inter[i] for i in keys}

        if limit is not None:
            query += " LIMIT " + str(limit)

        cursor = db.cursor()
        cursor.connection.autocommit(True)
        cursor.execute(query, values)

        data = cursor.fetchall()
        cursor.close()
        # for row in data :
        return data

    def selectOne(self, table, fields, where = None, where_inter = []):
        """Same functionality as selectAll, but only returns the first row from
        the query results. Returns None if there are no results for the query.
        """

        result = self.selectAll(table, fields, where, where_inter, limit=1)
        # if result is an empty list, should return None
        if not result:
            return None
        else:
            return result[0]

    def selectJoin(self, fields, where = "", where_inter = [], limit = None):
        """Select the given fields for the rows in the joined jive_profile and
        medifaces_player tables that match the where query.

        -   fields is a comma-separated string of the fields you wish to return
            or "*" if you want to return all fields.
        -   where is an optional string parameter that represents the WHERE
            query to filter rows by. If there is any data that needs to be
            escaped, its placement should be marked with a set of empty curly
            braces {} and the data should be given in the where_inter list. The
            jive_profile table should be referenced with "j" (e.g. j.fullname)
            and the medifaces_player table should be referenced with "m"
            (e.g. m.gender) if there is ambiguity (i.e. the tables have columns
            with the same name)
        -   where_inter is the list of data that should be interpolated into
            the WHERE query string. Each element should be given in the same
            order as its corresponding {} marker in where. where_inter should
            not be provided if where is not given
        -   limit is an optional integer parameter that represents the number
            of rows the query result should be limited to. Note that fewer rows
            may be returned if the query results in a smaller number of rows
            than the limit. If limit is not given, all rows resulting from the
            query will be returned.
        """

        query = "SELECT %s FROM %s as j JOIN %s as m ON j.id = m.jive_profile_id" % (fields, config.JIVE_PROFILE_TBL, config.MEDIFACES_PLAYER_TBL)

        values = {}
        if where != "":
            query += " WHERE "
            where = where.replace("%", "%%") # escape % symbols
            keys = range(len(where_inter))
            query += where.format( *["%(" + str(i) + ")s" for i in keys] )
            values = {str(i): where_inter[i] for i in keys}

        if limit is not None:
            query += " LIMIT " + str(limit)

        # logging.info('selectJoin: '+query)
        cursor = db.cursor()
        cursor.execute(query, values)

        db.commit()
        data = cursor.fetchall()
        cursor.close()
        return data

    def selectOneJoin(self, fields, where = "", where_inter = []):
        """Same functionality as selectJoin, but only returns the first row from
        the query results. Returns None if there are no results for the query.
        """

        result = self.selectJoin(fields, where, where_inter, limit=1)
        # if result is an empty list, should return None
        if not result:
            return None
        else:
            return result[0]

    def selectIdentified(self, jive_profile_id):
        """Get the number of people a player has identified correctly.

        -   jive_profile_id is the id of the player in the jive_profile table.
        """
        inner_query = "SELECT * FROM "+config.MEDIFACES_GAME_TURN_TBL+" WHERE game_state = 'W' AND jive_profile_id = '"+jive_profile_id+"' GROUP BY p_shown_email_id" # get all players you've collected

        query = "SELECT COUNT(*) FROM ("+inner_query+") as g JOIN "+config.MEDIFACES_PLAYER_TBL+" as p on g.p_shown_email_id = p.jive_profile_id where p.bad_avatar = 0" #count all collected players with good avatars

        # logging.info('selectNotIdentified: '+query)
        cursor = db.cursor()
        cursor.execute(query)
        db.commit()
        data = cursor.fetchone()
        cursor.close()
        return data

    def getUsersAllInfoRegistered(self):
        """Retrieve the list of data of all users formatted by
        [fullname, email, department, level, level_name, points, location, title]
        and sorted by number of points in descending order.
        """

        query = "SELECT j.fullname as fullname, j.email as email, j.department as dept, m.level as level, m.level_name as level_name, m.points as points, j.location as location, j.title as title FROM " + config.MEDIFACES_PLAYER_TBL+" as m INNER JOIN " + config.JIVE_PROFILE_TBL+" as j ON j.id = m.jive_profile_id WHERE m.registered = 1 ORDER BY points DESC"
        # logging.info('getUsersAllInfoRegistered: '+query)
        cursor = db.cursor()
        cursor.execute(query)
        db.commit()
        data = cursor.fetchall()
        cursor.close()
        return data

    def deleteRowById(self, table, id):
        """Deletes one row from table given the ID of the row.
        
        -   table is the name of the SQL table.
        -   id is the id of the row you want to delete from the table
        """

        query = "DELETE FROM " + table + " WHERE id = %(id)s LIMIT 1"
        values = {"id": id}
        logging.info("deleteRow: "+ query)
        cursor = db.cursor()
        cursor.execute(query, values)
        db.commit()
        cursor.close()

    def getLevel(self, email):
        """Return level number, name, and progress toward next level. Progress
        is an integer between 0 and 100 that represents the user's percentage of
        the way to the next level. The return value will be a tuple in the
        format (level, name, progress).

        - email is a string of the user's email address
        """

        medex_player = self.selectOneJoin("m.points", "j.email = {}", [email])

        if medex_player is None:
            points = 0
        else:
            points = medex_player[0]
        return getLevelInfo(points)

    def deleteGameProgress(self, jive_profile_id):
        """Delete all game progress for this user.
        
        - jive_profile_id is the id number of the user in the jive_profile
        table
        """

        values = {"id": jive_profile_id, "level_name": DEFAULT_LEVEL_NAME}
        cursor = db.cursor()

        query = "DELETE FROM "+config.MEDIFACES_GAME_TURN_TBL+" WHERE jive_profile_id = %(id)s;"
        cursor.execute(query, values)
        query = "DELETE FROM "+config.MEDIFACES_REVIEW_TBL+" WHERE jive_profile_id = %(id)s;"
        cursor.execute(query, values)
        query = "UPDATE "+config.MEDIFACES_PLAYER_TBL+" SET level_name=%(level_name)s,points=0,level=1 where jive_profile_id = %(id)s;"
        cursor.execute(query, values)
        db.commit()
        cursor.close()
