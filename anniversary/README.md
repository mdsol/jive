# Jive Anniversary

Jive Anniversary posts a status update to a specific group when a user has a work anniversary as indicated by the "Hire Date" field in their user profile. It can also post status updates at regional appropriate timezones if a "Region" field is set appropriately.
For example, if cron jobs are set up accordingly:
 - at 0:00 UTC it will run for APAC users
 - at 8:00 UTC it will run for EMEA users
 - at 14:00 UTC it will run for all other users

For a corporate intranet, you can have it only run for active full-time employees, by filtering on "Employee Type" and "Employee Status" fields.

The status message will look something like:
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

4. You can also set a cronjob to run regularly and and write info.log file with:
```
5 0 * * * /usr/bin/node /path/to/anniversary/index.js > /path/to/anniversary/info.log
```
