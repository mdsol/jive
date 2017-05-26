# Jive Anniversary

Jive Anniversary will post a status update when an employee are having an anually work anniversary.
The status will be posted in a Jive group depending on the time of the day:

 - at Hour 0 it will run from APAC
 - at Hour 8 it will run from EMEA
 - for the rest of the hours it will for all regions.

It's also checking if the worker is permanent (is not *Contingent worker* and is noy working *Remote*), and worker is not *inactive*.

The message it will look like this:
````
John Doe celebrated 2 years at Steel Inc. today.
 
*Posted by UserBot​*
````
## Requirements
- Node.js

## Quickstart

1. Clone repository and cd to tile directory

2. Install dependencies
 ```
 npm install
 ```

3. Run script:
 ```
 node index.js
 ```

4. You can also set a cronjob to run periodically (eg running every day at 00:05) and write info.log file.
```
5 0 * * * /usr/bin/node /path/to/anniversary/index.js > /path/to/anniversary/info.log
```