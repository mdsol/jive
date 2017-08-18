## Zendesk Jive Migrator

Zendesk Jive Migrator is copying the files from Zendesk Help Center, from the categories you configure to do it.

You have to run the MySQL scripts from *help_center_tables.sql* to create the tables where categories, section and articles.

To run the script, you need to set the functionyou want to run:

 - *migrate* - is migrating the files from Zendesk to Jive.
 - *clean* - clean the MySQL tables, and to delete the documents that exists in a space;

## Requirements
- Node.js

## Quickstart

1. Clone repository and cd to tile directory

2. Install dependencies
 ```
 npm install
 ```
3. Create your own tables from help_center_tables.sql.

4. Run script:
 ```
 node migrator.js migrate
 ```

5. You can also set a cronjob to run regularly and and write *info.log* file with:
```
5 0 * * * /usr/bin/node /path/to/zendesk-jive-migrator/migrator.js > /path/to/zendesk-jive-migrator/migrator.log
```

Extra:

An extra feature is to clean Mysql tables and documents that was created into Jive. It's useful when you make multiple tests.