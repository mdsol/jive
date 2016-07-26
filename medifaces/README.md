Medifaces
=========

Medifaces is an app that allows users with valid profile pictures in their connected Jive Instance, to play a game of trying to identify their co-workers.
Players receive a point for every co-worker they correctly identify. It also posts status updates in their Jive Instance each time they advance a level.

Inspiration
-----------

In April/May 2013 Ian Sparks took a Coursera course on Gamification. One of the real-world uses of gamification,
briefly mentioned in the course, was Zappo's who have a game where you identify your co-workers. I thought
that something similar might be fun at Medidata.

Deployment
----------

The app is currently designed to run in Google's Appengine.  The middleware for connecting Jive needs to run on a seperate Linux server.

You can run this app locally. You will require the App Engine SDK (Python version) and Python v2.7.
DO NOT use Python 3.x.

Monitoring
----------

The application uses 3 types of monitoring:

1) Logging goes to App Engine's log system
2) AppStats generates info about the performance of the application

PUBNUB
------

PubNub is used to broadcast messages to all users and for in-game chat. At the moment, history is
only enabled in PUBNUB for paying customers and this app is using the free demo tier.




