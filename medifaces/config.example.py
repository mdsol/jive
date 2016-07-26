# tables for production - medex-faces
MEDIFACES_GAME_TURN_TBL = ''
MEDIFACES_PLAYER_TBL    = ''
JIVE_PROFILE_TBL        = ''
MEDIFACES_REVIEW_TBL    = ''


# if True, use local instance of database, else server
_USE_LOCAL_DB = False


_INSTANCE_NAME = ''

# Server DB Info
server = {
    '_MYSQL_DB': '',
    '_MYSQL_USER': '',
    '_MYSQL_PASS': '',
    '_MYSQL_HOST': '',
    '_MYSQL_PORT': 
}

# Local DB Info
local = {
    '_MYSQL_DB'  : '',
    '_MYSQL_USER': '',
    '_MYSQL_PASS': '',
    '_MYSQL_HOST': '',
    '_MYSQL_PORT': 
}

db = local if _USE_LOCAL_DB else server
_MYSQL_DB, _MYSQL_USER, _MYSQL_PASS, _MYSQL_HOST, _MYSQL_PORT = db['_MYSQL_DB'], db['_MYSQL_USER'], db['_MYSQL_PASS'], db['_MYSQL_HOST'], db['_MYSQL_PORT']

jive_username = ''
jive_password = ''
jive_medifaces_space = ''

jive_basicUrl   = '';
jive_apiCore    = jive_basicUrl + '/api/core/v3/';
jive_contentUrl = jive_apiCore + 'contents';
jive_placeUrl   = jive_apiCore + 'places';

pubnub_publish_key = ''
pubnub_subscribe_key = ''
