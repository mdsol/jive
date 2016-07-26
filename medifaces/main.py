#!/usr/bin/env python
#
# Copyright 2007 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
import webapp2
from views import *
import os

IS_DEV_SERVER =  os.environ['SERVER_SOFTWARE'].startswith('Dev')

app = webapp2.WSGIApplication([
    ('/', IndexHandler),
    ('/about', AboutHandler),
    ('/register', RegisterUserHandler),  #user self-service version
    ('/play', PlayHandler),
    ('/me', MeHandler),
    ('/scores', ScoreHandler),
    ('/logout', LogoutHandler),
    ('/letsplay', LetsPlayHandler),
    ('/medidataonly', MustBeMedidataHandler),  #You get this URL if you are not a medidata user (@mdsol.com)
    ('/badavatar', BadAvatarHandler),
    ('/needprofilepicture', ProfilePictureHandler),
    ('/review', ReviewHandler)
], debug=IS_DEV_SERVER)
