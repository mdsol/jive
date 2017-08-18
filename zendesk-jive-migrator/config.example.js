// Jive Analytics
var config = {
    urlType              : 'https://',
    apiCore              : '/api/core/v3/',
    peopleUrl            : '/api/core/v3/people',
    placeUrl             : '/api/core/v3/places',
    contentUrl           : '/api/core/v3/contents',
    membersUrl           : '/api/core/v3/members',
    imagesUrl            : '/api/core/v3/images'
};

// Jive Analytics API & Jive API
var config = {
    username         : '', //username or email
    password         : '', //password
    url_type         : 'https://',
    basicUrl         : '', //sandbox.jiveon.com/
    apiCore          : '/api/core/v3/',
    peopleApiUrl     : '/api/core/v3/people',
    placeApiUrl      : '/api/core/v3/places',
    contentApiUrl    : '/api/core/v3/contents',
    placeUrl         : '', //place is the url of Jive Space
};

config.zendesk = {
    urlType              : 'https://',
    urlBasic             : "", //support.mdsol.com
    email                : "", // email username
    password             : "", //password
    helpCenterUrl        : "/api/v2/help_center/",
    locale               : "en-us",
    articlesUrl          : "/articles.json",
    name                 : 'Medidata Help Center', // name of help center in Zendesl eg. Medidata Help Center
    categories           : [] // eg. ['Knowledge Base', 'Helpful Tips']
};

//Jive instance
config.production = {
    basicUrl          : '', // eg. mdsol.jiveon.com
    username          : '',
    password          : '',
    placeUrl          : '' // Space url
};

//Mysql connection
config.connection = {
    host     : '',
    database : '',
    user     : '',
    password : '',
    port     : ''
};

//Mysql tables
config.tables = {
    hc_categories  : 'help_center_categories',
    hc_sections    : 'help_center_sections',
    hc_articles    : 'help_center_articles',
};

module.exports = config;