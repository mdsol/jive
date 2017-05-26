// Jive Analytics API & Jive API
var config = {
    ja_basic_url     : 'https://api.jivesoftware.com',
    username         : '', //username or email
    password         : '', //password
    url_type         : 'https://',
    basicUrl         : '', //sandbox.jiveon.com/
    apiCore          : '/api/core/v3/',
    peopleUrl        : '/api/core/v3/people',
    placeUrl         : '/api/core/v3/places',
    contentUrl       : '/api/core/v3/contents',
    placeId          : '' // placeId of the space where the Status Update will be posted
};

config.basicAuth = 'Basic ' + new Buffer(config.username + ':' + config.password).toString('base64');

module.exports = config;