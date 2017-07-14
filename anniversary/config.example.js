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
    placeUrl         : '' //url of Jive Group to post status messages to
};

config.basicAuth = 'Basic ' + new Buffer(config.username + ':' + config.password).toString('base64');

module.exports = config;
