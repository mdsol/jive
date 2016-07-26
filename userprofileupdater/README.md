# User Profile Updater

## Requirements
- Node.js

## Twitter Handle Updater
1. Clone repository and cd to userprofileupdater directory
2. Install dependencies
 ```
 npm install
 ```

3. Update config.example.json with authentication information and the URL of
your Jive instance, and rename the file to config.json

4. Update twitter-handles.csv with the email address and Twitter handle of each
user you wish to update in the format "Email,Twitter_Handle"

5. Run twitter.js
 ```
 node twitter.js
 ```
