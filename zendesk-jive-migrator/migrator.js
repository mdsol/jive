var request     = require('request');
var https       = require('https');
var fs          = require('fs');
var url         = require('url');
var path        = require('path');
var mysql       = require('mysql');
var dateFormat  = require('dateformat');
var querystring = require('querystring');
var q           = require('q');
var async       = require('async');
var sleep       = require('sleep');
var striptags   = require('striptags');
var config      = require('./config');


var connection  = mysql.createConnection({
        host     : config.connection.host,
        user     : config.connection.user,
        password : config.connection.password,
        database : config.connection.database,
        port     : config.connection.port,
    });

var env = "";

if(typeof process.argv.slice(2)[0] !== 'undefined') {
    var info = process.argv.slice(2)[0].split("_");
    if(typeof info[0] !== "undefined") {
        if(info[0] == "mdsol") {
            env = config.production;
        } else if(info[0] == "mdsol-sandbox") {
            env = config.sandbox;
        } else {
            console.log("This instance is not existing.");
            process.exit();
        }
    }
    var basicAuth        = 'Basic ' + new Buffer(env.username + ':' + env.password).toString('base64');
    var basicAuthZendesk = 'Basic ' + new Buffer(config.zendesk.email + ':' + config.zendesk.password).toString('base64');
    
    if(info[1] == "migrate") {
        migrate();
    } else if(info[1] == "clean") {
        clean();
    }
} else {
    console.log("You didn't select the instance and the function.");
    process.exit();
}

function migrate()
{
    findPlaceId().then(function(place_id) {
        if(place_id !== "")
        {
            // update categories/sections/articles in DB
            updateCategoriesDB().then(function(categories) {
                updateSectionsDB(categories).then(function(sections) {
                    updateArticlesDB(sections).then(function(articles) {
                        // delete categories/sections/articles  in DB
                        deleteOldArticlesDB(sections, articles).then(function(result) {
                            deleteOldSectionsDB(categories, sections).then(function(result) {
                                deleteOldCategoriesDB(categories).then(function(result) {
                                    //update the articles
                                    updateArticles(place_id).then(function(res) {
                                        //delete unexisting documents in Jive
                                        deleteOldDocuments(place_id).then(function(res) {
                                            console.log('Tadaaaa');
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        } else {
            console.log('We can find place id. Make sure the place url is correct');
            process.exit();
        }
    });
}

function findPlaceId(callback)
{
    var deferred = q.defer();
    // var url = 'https://mdsol-sandbox.jiveon.com/community/zendesk-jive-migrator';
    var placeName = env.placeUrl.split("/").pop();
    var placeId   = "";
    var new_parent_url = config.urlType + env.basicUrl + config.placeUrl + "/?filter=search(" + placeName + ")";
    
    sendGetData(new_parent_url).then(function(new_space_data) {
        if(typeof new_space_data.message !== 'undefined') {
            console.log(new_space_data.message);
            process.exit();
        } else {
            async.eachSeries(new_space_data.list, function iterator(space, callback1) {
                if(env.placeUrl == space.resources.html.ref) {
                    placeId = space.placeID;
                }
                callback1(null, space);
            }, function done() {
                console.log("Place id: " + placeId);
                deferred.resolve(placeId);
            });
        }
    }, function (error) {
        deferred.reject(new Error('No space'));
        console.log('Handle error: ' + error.stack);
        throw error;
    });
    return deferred.promise;
}

function clean()
{
    truncateAllHCtables(config.tables.hc_articles).then(function(response1) {
        truncateAllHCtables(config.tables.hc_sections).then(function(response2) {
            truncateAllHCtables(config.tables.hc_categories).then(function(response3) {
                console.log('Truncated all tables!');
                findPlaceId().then(function(place_id) {
                    deleteAllDocuments(place_id).then(function() {
                        console.log('All documents were deleted!');
                    });
                });
            });
        });
    });
}

function truncateAllHCtables(table)
{
    var deferred = q.defer();
    var sql = "TRUNCATE TABLE `" + table + "`;";
    connection.query(sql, deferred.makeNodeResolver());
    return deferred.promise;
}

function deleteOldDocuments(parent_place_id, callback)
{
    var deferred = q.defer();
    var url_places = config.placeUrl + '/' + parent_place_id + '/places';
    sendGetData(url_places).then(function(new_space_data) {
        async.eachSeries(new_space_data.list, function iterator(place, callback3) {
            var place_id = place.placeID;
            var place_content_url = config.placeUrl + '/' + place_id + '/contents';
            async.whilst(
                function () { return place_content_url; },
                function (callback1) {
                    sendGetData(place_content_url).then(function(content) {
                        async.eachSeries(content.list, function iterator(doc, callback2) {
                            var content_id = doc.contentID;
                            findDocument(content_id).then(function(results1) {
                                results1 = results1[0];
                                if(results1.length == 0)
                                {
                                    console.log('Nu e in db: -' + doc.subject);
                                    deleteDocuments(content_id);
                                }
                                callback2(null, content_id);
                            }, function (error) {
                                console.error('Handle error: ' + error.stack);
                                throw error;
                            });
                        }, function done() {
                            place_content_url = false;
                            if(typeof content.links !== 'undefined') place_content_url = content.links.next;
                            callback1(null, place_content_url);
                        });
                    });
                },
                function (err) {
                    console.log(err);
                }
            );
            
            callback3(null, place_id);
        }, function done() {
            console.log('exit');
            deferred.resolve("true");
        });
    });
}

function deleteDocuments(content_id, callback)
{
    var deferred = q.defer();
    var data = {
            host:     env.basicUrl,
            port:     443,
            path:     config.contentUrl + '/' + content_id,
            method:   'DELETE',
            headers:  {
                'Authorization': basicAuth,
                'Content-Type': 'application/json'
            }
        };

    var req = https.request(data, function(res) {
        res.setEncoding('utf8');
        var str = '';
        res.on('data', function (chunk) {
            str += chunk;
        });
        res.on('end', function () {
            console.log(str);
            deferred.resolve(true);
        });
    });
    req.end();
    req.on('error', function(e) {
        deferred.reject(new Error(e));
    });
}

function deleteAllDocuments(place_id, callback)
{

    var deferred = q.defer();
    var new_parent_url = config.urlType + env.basicUrl + config.placeUrl + '/' + place_id + '/contents?filter=type(document)';

    sendGetData(new_parent_url).then(function(new_space_data) {
        if(typeof new_space_data.message !== 'undefined') {
            console.log(new_space_data.message);
            process.exit();
        } else {
            async.eachSeries(new_space_data.list, function iterator(document, callback1) {
                var data = {
                        host:    env.basicUrl,
                        port:    443,
                        path:    document.resources.self.ref,
                        method:  'DELETE',
                        headers: {
                            'Authorization': basicAuth,
                            'Content-Type': 'application/json'
                        }
                };
                var req = https.request(data, function(res) {
                        res.setEncoding('utf8');
                        var str = '';
                        res.on('data', function (chunk) {
                            str += chunk;
                        });
                        res.on('end', function () {
                            callback1(null, str);
                        }, function (error) {
                            console.log('Error defer reject at sendData');
                            deferred.reject(new Error(error));
                        });
                    });

                req.end();
                req.on('error', function(e) {
                    console.log('Error: ');
                    console.log(e);
                });
                
            }, function done() {
                deferred.resolve(place_id);
            });
        }
    }, function (error) {
        deferred.reject(new Error('No document'));
        console.log('Handle error: ' + error.stack);
        throw error;
    });

    deferred.promise.nodeify(callback);
    return deferred.promise;
}

function deleteAllSubspaces(place_id, callback)
{
    var deferred = q.defer();
    var new_parent_url = config.urlType + env.basicUrl + config.placeUrl + "/" + place_id + "/places";
    sendGetData(new_parent_url).then(function(new_space_data) {
        if(typeof new_space_data.message !== 'undefined') {
            console.log(new_space_data.message);
            process.exit();
        } else {
            async.eachSeries(new_space_data.list, function iterator(space, callback1) {
                if(space.type !== 'blog') {
                    var data = {
                            host:    env.basicUrl,
                            port:    443,
                            path:    space.resources.self.ref,
                            method:  'DELETE',
                            headers: {
                                'Authorization': basicAuth,
                                'Content-Type': 'application/json'
                            }
                    };
                    var req = https.request(data, function(res) {
                            res.setEncoding('utf8');
                            var str = '';
                            res.on('data', function (chunk) {
                                str += chunk;
                            });
                            res.on('end', function () {
                                callback1(null, str);
                            }, function (error) {
                                console.log('Error defer reject at sendData');
                                deferred.reject(new Error(error));
                            });
                        });

                    req.end();
                    req.on('error', function(e) {
                        console.log('Error: ');
                        console.log(e);
                    });
                } else {
                    callback1(null, space);
                }
                
            }, function done() {
                deferred.resolve(place_id);
            });
        }
    }, function (error) {
        deferred.reject(new Error('No space'));
        console.log('Handle error: ' + error.stack);
        throw error;
    });

    deferred.promise.nodeify(callback);
    return deferred.promise;
}

function updateArticles(place_id, callback)
{

    var deferred   = q.defer();
    var sub_spaces = [];
    
    var date_now = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    var columns = ['jive_id', 'jive_place_id', 'jive_content_id', 'jive_url', 'jive_title', 'jive_updated'];

    getAllArticles().then(function(articlesDB) {
        sendGetData(config.placeUrl + '/' + place_id + '/contents?filter=type(document)').then(function(documents) {
            async.eachSeries(articlesDB[0], function iterator(article_db, callback3) {
                if(documents.list.length !== 0) {
                    async.eachSeries(documents.list, function iterator(document, callback4) {
                        if(article_db.jive_id == null)
                        {
                            var new_parent_url = config.placeUrl + '/' + place_id;
                            writeDocumentWhiteOnWhite('POST', article_db, new_parent_url, '').then(function(response) {
                                
                                if(typeof response.error !== "undefined") {
                                    if(response.error.status == 409) {
                                        console.log(article_db.title);
                                        console.log(response.error.message);
                                        callback4(null, response);
                                    } else {
                                        callback4(null, response);
                                    }
                                } else {
                                    console.log('&&&');
                                    var data    = {
                                        jive_id         : response.id,
                                        jive_place_id   : response.parentPlace.id,
                                        jive_content_id : response.contentID,
                                        jive_url        : response.resources.html.ref,
                                        jive_title      : response.subject,
                                        jive_content    : response.content,
                                        jive_updated    : date_now
                                    }
                                    update_sql(config.tables['hc_articles'], data, columns, article_db.id).then(function(res) {
                                        console.log(document.subject);
                                        console.log('New article!!!');
                                        callback4(null, article_db);
                                    });
                                }
                            });
                        } else {
                            console.log(article_db.jive_content_id == document.contentID);
                            console.log(article_db.jive_content_id + " - " + document.contentID);
                            //check if it is the same id
                            if(article_db.jive_content_id == document.contentID) {
                                //check if something is changed into article.
                                console.log(article_db.name + ' - ' + document.subject + ' - ' + article_db.jive_content + ' - ' + document.content.text + ' - ' + new Date(article_db.jive_updated).toString() + ' - ' + new Date(document.lastActivityDate).toString());
                                if(article_db.name == document.subject && article_db.body == document.content.text && 
                                        new Date(article_db.jive_updated).toString() <= new Date(document.lastActivityDate).toString()) {

                                    console.log('No change ' + article_db.jive_title);
                                    callback4(null, article_db);
                                } else {
                                    var new_parent_url = config.placeUrl + '/' + place_id;
                                    writeDocumentWhiteOnWhite('PUT', article_db, new_parent_url, '/' + article_db.jive_content_id).then(function(response) {
                                        var data    = {
                                            jive_id         : response.id,
                                            jive_place_id   : response.parentPlace.id,
                                            jive_content_id : response.contentID,
                                            jive_url        : response.resources.html.ref,
                                            jive_title      : response.subject,
                                            jive_content    : response.content,
                                            jive_updated    : date_now
                                        }
                                        update_sql(config.tables['hc_articles'], data, columns, article_db.id).then(function(res) {
                                            console.log('Update article!!!');
                                            callback4(null, article_db);
                                        });
                                    });
                                }
                            } else {
                                console.log('It\'s not the same article!');
                                callback4(null, article_db);
                            }
                        }
                    }, function done() {
                        console.log('Done article');
                        callback3(null, true);
                    });

                } else {
                    var new_parent_url = config.placeUrl + '/' + place_id;
                    writeDocumentWhiteOnWhite('POST', article_db, new_parent_url, '').then(function(response) {
                    
                        if(typeof response.error !== "undefined") {
                            if(response.error.status == 409) {
                                console.log(article_db.title);
                                console.log(response.error.message);
                            }
                            callback3(null, response);
                        } else {
                            var data    = {
                                jive_id         : response.id,
                                jive_place_id   : response.parentPlace.id,
                                jive_content_id : response.contentID,
                                jive_url        : response.resources.html.ref,
                                jive_title      : response.subject,
                                jive_content    : response.content,
                                jive_updated    : date_now
                            }
                            update_sql(config.tables['hc_articles'], data, columns, article_db.id).then(function(res) {
                                console.log('New article!!!');
                                callback3(null, article_db);
                            });
                        }
                    });
                }
            }, function done() {
                console.log('Done jive');
                callback2(null, space);
            });
        });
    });
    deferred.promise.nodeify(callback);
    return deferred.promise;
}

function updateArticles2(place_id, callback)
{
    var deferred = q.defer();
    var sub_spaces = [];

    var date_now = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    var columns = ['jive_id', 'jive_place_id', 'jive_content_id', 'jive_url', 'jive_title', 'jive_updated'];

    sendGetData(config.placeUrl + '/' + place_id + '/places').then(function(spaces) {
        async.eachSeries(spaces.list, function iterator(space, callback2) {
            getArticlesFromSpaceId(space.placeID).then(function(articlesDB) {
                sendGetData(config.placeUrl + '/' + space.placeID + '/contents?filter=type(document)').then(function(documents) {
                    async.eachSeries(articlesDB[0], function iterator(article_db, callback3) {
                        if(documents.list.length !== 0) {
                            async.eachSeries(documents.list, function iterator(document, callback4) {
                                if(article_db.jive_id == null)
                                {
                                    var new_parent_url = config.placeUrl + '/' + article_db.jive_place_id;
                                    writeDocumentWhiteOnWhite('POST', article_db, new_parent_url, '').then(function(response) {
                                        
                                        if(typeof response.error !== "undefined") {
                                            if(response.error.status == 409) {
                                                console.log(article_db.title);
                                                console.log(response.error.message);
                                                callback4(null, response);
                                            } else {
                                                callback4(null, response);
                                            }
                                        } else {
                                            console.log('&&&');
                                            var data    = {
                                                jive_id         : response.id,
                                                jive_place_id   : response.parentPlace.id,
                                                jive_content_id : response.contentID,
                                                jive_url        : response.resources.html.ref,
                                                jive_title      : response.subject,
                                                jive_content    : response.content,
                                                jive_updated    : date_now
                                            }
                                            update_sql(config.tables['hc_articles'], data, columns, article_db.id).then(function(res) {
                                                console.log(document.subject);
                                                console.log('New article!!!');
                                                callback4(null, article_db);
                                            });
                                        }
                                    });
                                } else {
                                    console.log(article_db.jive_content_id == document.contentID);
                                    console.log(article_db.jive_content_id + " - " + document.contentID);
                                    //check if it is the same id
                                    if(article_db.jive_content_id == document.contentID) {
                                        //check if something is changed into article.
                                        console.log(article_db.name + ' - ' + document.subject + ' - ' + article_db.jive_content + ' - ' + document.content.text + ' - ' + new Date(article_db.jive_updated).toString() + ' - ' + new Date(document.lastActivityDate).toString());
                                        if(article_db.name == document.subject && article_db.body == document.content.text && 
                                                new Date(article_db.jive_updated).toString() <= new Date(document.lastActivityDate).toString()) {

                                            console.log('No change ' + article_db.jive_title);
                                            callback4(null, article_db);
                                        } else {
                                            var new_parent_url = config.placeUrl + '/' + article_db.jive_place_id;
                                            writeDocumentWhiteOnWhite('PUT', article_db, new_parent_url, '/' + article_db.jive_content_id).then(function(response) {
                                                var data    = {
                                                    jive_id         : response.id,
                                                    jive_place_id   : response.parentPlace.id,
                                                    jive_content_id : response.contentID,
                                                    jive_url        : response.resources.html.ref,
                                                    jive_title      : response.subject,
                                                    jive_content    : response.content,
                                                    jive_updated    : date_now
                                                }
                                                update_sql(config.tables['hc_articles'], data, columns, article_db.id).then(function(res) {
                                                    console.log('Update article!!!');
                                                    callback4(null, article_db);
                                                });
                                            });
                                        }
                                    } else {
                                        console.log('It\'s not the same article!');
                                        callback4(null, article_db);
                                    }
                                }
                            }, function done() {
                                console.log('Done article');
                                callback3(null, true);
                            });

                        } else {
                            var new_parent_url = config.placeUrl + '/' + article_db.jive_place_id;
                            writeDocumentWhiteOnWhite('POST', article_db, new_parent_url, '').then(function(response) {
                            
                                if(typeof response.error !== "undefined") {
                                    if(response.error.status == 409) {
                                        console.log(article_db.title);
                                        console.log(response.error.message);
                                    }
                                    callback3(null, response);
                                } else {
                                    var data    = {
                                        jive_id         : response.id,
                                        jive_place_id   : response.parentPlace.id,
                                        jive_content_id : response.contentID,
                                        jive_url        : response.resources.html.ref,
                                        jive_title      : response.subject,
                                        jive_content    : response.content,
                                        jive_updated    : date_now
                                    }
                                    update_sql(config.tables['hc_articles'], data, columns, article_db.id).then(function(res) {
                                        console.log('New article!!!');
                                        callback3(null, article_db);
                                    });
                                }
                            });
                        }
                    }, function done() {
                        console.log('Done jive');
                        callback2(null, space);
                    });
                });
            });
            // });
        }, function done() {
            console.log('Done jive');
            deferred.resolve(true); 
        });
    });
    deferred.promise.nodeify(callback);
    return deferred.promise;
}

function writeDocumentWhiteOnWhite(action, rows, new_parent_url, jive_id, callback)
{
    var deferred = q.defer();
    
    var tags = [config.zendesk.name, rows.section_name, rows.category_name];
    var regex = /(<([^>]+)>)/ig;
    
    rows.body = striptags(rows.body);
    rows.body = rows.body.replace(regex, "");
    rows.body = rows.body.replace(/@/g, "_at_");
    rows.body = rows.body.replace(/https?\:\/\//g, "");
    rows.body = rows.body.replace(/http?\:\/\//g, "");

    var content  = '<div><a href="' + rows.html_url + '"><img src="https://mdsol.jiveon.com/servlet/JiveServlet/downloadImage/186467/click-here-to-access.png" alt="Click here to access document" /></a></div>' +
                    '<br />' +
                    '<style>a {color: white;}</style>' +
                    '<div style="color: white; font-size: 2px"> ' + rows.body + ' </div';
    // var content  = '<div><a href="' + rows.html_url + '"><img src="https://mdsol-sandbox.jiveon.com/servlet/JiveServlet/showImage/38-60779-231046/click-here-to-access.png" alt="Click here to access document" /></a></div>' +
    //                 '<br />' +
    //                 '<style>a {color: white;}</style>' +
    //                 '<div style="color: white; font-size: 2px"> ' + rows.body + ' </div';
    
    var doc_data = {
            visibility   : "place",
            subject      : rows.name,
            parent       : new_parent_url,
            contentTypes : [ "documents"],
            type         : "document",
            tags         : [tags.toString()],
            content      : {
                type : "text/html; charset=utf-8",
                text : content
            }
        };
    var options = {
        hostname: env.basicUrl,
        path: config.contentUrl + jive_id,
        port: 443,
        method: action,
        headers: {
                "Authorization": basicAuth,
                "Content-Type": "application/json"
            }
    };
    var post_data = JSON.stringify(doc_data);
    
    jiveRequest(options, post_data).then(function(response) {
        if(typeof response.error !== 'undefined') {
            console.log('Error: ');
            console.log(rows.name + ' - '+ response.error.message);
        }
        deferred.resolve(response);
    }, function (error) {
        console.log('Handle error: ' + error.stack);
        throw error;
    });

    return deferred.promise;
}

function sendGetData(url, callback)
{
    var deferred = q.defer();
    var data = {
            host:    env.basicUrl,
            port:    443,
            path:    url,
            method:  'GET',
            headers: {
                'Authorization': basicAuth,
                'Content-Type': 'application/json'
            }
    };
    var req = https.request(data, function(res) {
            res.setEncoding('utf8');
            var str = '';
            res.on('data', function (chunk) {
                str += chunk;
            });
            res.on('end', function () {
                str = JSON.parse(str);
                deferred.resolve(str);
            }, function (error) {
                console.log('Error defer reject at sendData');
                deferred.reject(new Error(error));
            });
        });

    req.end();
    req.on('error', function(e) {
        console.log('Ce eroare!!');
        console.log(e);
    });
    return deferred.promise;
}

function deleteOldArticlesDB(sections, articles, callback)
{
    var deferred = q.defer();
    async.eachSeries(sections, function iterator(section, callback1) {
        getArticlesFromSectionId(section).then(function(rows, error) {
            async.eachSeries(rows[0], function iterator(row, callback2) {
                if(articles.indexOf(row.zendesk_id) == -1) {
                    deleteRowsDB(config.tables['hc_articles'], row.zendesk_id).then(function(row1) {
                        console.log('Delete article: ' + row.name);
                        callback2(null, row);
                    });
                } else {
                    callback2(null, row);
                }
            }, function done() {
                console.log('Done section');
                callback1(null, rows);
                
            });
        }, function (error) {
            deferred.reject(new Error(error));
        });
    }, function done() {
        console.log('Done dOADB');
        deferred.resolve(sections);
    });
    return deferred.promise;
}

function deleteOldSectionsDB(categories, sections, callback)
{
    var deferred = q.defer();
    async.eachSeries(categories, function iterator(category, callback1) {
        getSectionsFromCategoryId(category).then(function(rows, error) {
            async.eachSeries(rows[0], function iterator(row, callback2) {

                if(sections.indexOf(row.zendesk_id) == -1) {
                    deleteRowsDB(config.tables['hc_sections'], row.zendesk_id).then(function(row1) {
                        console.log('Delete section: ' + row.name);
                        callback2(null, row);
                    });
                } else {
                    callback2(null, row);
                }          
            }, function done() {
                console.log('Done');
                deferred.resolve(rows);
            });
        }, function (error) {
            deferred.reject(new Error(error));
        });
    }, function done() {
        console.log('Done dOADB');
        deferred.resolve(sections);
    });
    
    return deferred.promise;
}

function deleteOldCategoriesDB(sections, callback)
{
    var deferred = q.defer();
    allCategories().then(function(rows, error) {
        async.eachSeries(rows[0], function iterator(row, callback2) {
            if(sections.indexOf(row.zendesk_id) == -1) {
                deleteRowsDB(config.tables['hc_categories'], row.zendesk_id).then(function(row1) {
                    console.log('Delete categories: ' + row.name);
                    callback2(null, row);
                });
            } else {
                console.log('No delete: ' + row.name);
                callback2(null, row);
            }          
        }, function done() {
            console.log('Done.');
            deferred.resolve(rows);
        });
    }, function (error) {
        deferred.reject(new Error(error));
    });
    return deferred.promise;
}

function updateArticlesDB(sections, callback)
{
    console.log('uA DB 1');
    var deferred = q.defer();

    var all_articles = [];
    async.eachSeries(sections, function iterator(section_id, callback1) {
        var data = {
            host:     config.zendesk.urlBasic,
            path:     config.zendesk.helpCenterUrl + config.zendesk.locale + '/sections/' + section_id + '/articles.json',
            method:   'GET',
            headers:  {
                'Authorization': basicAuthZendesk,
                'Content-Type': 'application/json'
            }
        };

        var req = https.request(data, function(res) {
                res.setEncoding('utf8');
                var str = '';
                res.on('data', function (chunk) {
                    str += chunk;
                });
                res.on('end', function () {
                    str = JSON.parse(str);
                    console.log('uA DB 2');

                    async.eachSeries(str.articles, function iterator(article, callback2) {


                        all_articles.push(article.id);
                        checkArticle(article.id).then(function(row, error) {
                            var columns = ['zendesk_id', 'section_id', 'name', 'title', 'body', 'html_url', 'author', 'draft', 'position', 'locale', 'outdated','created_at', 'updated_at'];
                            if(row[0].length == 0) {
                                //create row
                                insert_sql(config.tables['hc_articles'], article, columns).then( function(data_id) {
                                    console.log('uC DB 3a');
                                    callback2(null, all_articles);
                                });
                            } else {
                                var updated_at1 = new Date(row[0][0].updated_at.toString());
                                var updated_at2 = article['updated_at'].toString();
                                if(updated_at1.toISOString().substring(0,19) !== updated_at2.substring(0,19)) {
                                    update_sql(config.tables['hc_articles'], article, columns, row[0][0].id).then( function(data_id) {
                                        console.log('uC DB 3b');
                                        callback2(null, all_articles);
                                    });
                                } else {
                                    callback2(null, all_articles);
                                }
                            }

                        }, function (error) {
                            console.log(error);
                        });
                    }, function done() {
                        console.log('Done _ 1');
                        callback1(null, all_articles);
                    });

                }, function (error) {
                    deferred.reject(new Error(error));
                });
        });

        req.end();
        req.on('error', function(e) {
            console.log('Ce eroare!!');
            console.log(e);
        });
    }, function done() {
        console.log('Done _ 1');
        deferred.resolve(all_articles);
    });
    
    return deferred.promise;
}

function updateSectionsDB(categories, callback)
{
    var deferred = q.defer();
    var all_sections = [];
    async.eachSeries(categories, function iterator(cat, callback1) {
        var data = {
            host:     config.zendesk.urlBasic,
            path:     config.zendesk.helpCenterUrl + config.zendesk.locale + '/categories/' + cat + '/sections.json',
            method:   'GET',
            headers:  {
                'Authorization': basicAuthZendesk,
                'Content-Type': 'application/json'
            }
        };

        var req = https.request(data, function(res) {
                res.setEncoding('utf8');
                var str = '';
                res.on('data', function (chunk) {
                    str += chunk;
                });
                res.on('end', function () {
                    str = JSON.parse(str);
                    console.log('uS DB 2');
                    async.eachSeries(str.sections, function iterator(section, callback2) {
                        
                        all_sections.push(section.id);
                        checkSection(section.id).then(function(row, error) {
                            var columns = ['zendesk_id', 'category_id', 'name', 'description', 'html_url', 'position', 'locale', 'outdated','created_at', 'updated_at'];
                            if(row[0].length == 0) {
                                //create row
                                insert_sql(config.tables['hc_sections'], section, columns).then( function(data_id) {
                                    console.log('uC DB 3a');
                                    callback2(null, all_sections);
                                });
                            } else {
                                var updated_at1 = new Date(row[0][0].updated_at.toString());
                                var updated_at2 = section['updated_at'].toString();
                                if(updated_at1.toISOString().substring(0,19) !== updated_at2.substring(0,19)) {
                                    console.log('Update - ' + section.name);
                                    update_sql(config.tables['hc_sections'], section, columns, row[0][0].id).then( function(data_id) {
                                        console.log('uC DB 3b');
                                        callback2(null, all_sections);
                                    });
                                } else {
                                    callback2(null, all_sections);
                                }
                            }
                        }, function (error) {
                            console.log(error);
                        });
                    }, function done() {
                        callback1(null, all_sections);
                    });

                }, function (error) {
                    deferred.reject(new Error(error));
                });
        });

        req.end();
        req.on('error', function(e) {
            console.log('Ce eroare!!');
            console.log(e);
        });

    }, function done() {
        console.log('Done_ 1');
        deferred.resolve(all_sections);
    });
    console.log('uS DB1'); 
    
    return deferred.promise;
}

function updateCategoriesDB(callback)
{
    console.log('uC DB 1');
    var deferred = q.defer();
    var data = {
        host:     config.zendesk.urlBasic,
        path:     config.zendesk.helpCenterUrl + config.zendesk.locale + '/categories.json',
        method:   'GET',
        headers:  {
            'Authorization': basicAuthZendesk,
            'Content-Type': 'application/json'
        }
    };

    var req = https.request(data, function(res) {
            res.setEncoding('utf8');
            var str = '';
            res.on('data', function (chunk) {
                str += chunk;
            });
            res.on('end', function () {
                str = JSON.parse(str);
                console.log('uC DB 2');
                var all_categories = [];
                async.eachSeries(str.categories, function iterator(category, callback2) {
                    if(config.zendesk.categories.indexOf(category.name) !== -1) {
                        all_categories.push(category.id);
                        checkCategory(category.id).then(function(row, error) {
                            var columns = ['zendesk_id', 'name', 'description', 'html_url', 'position', 'locale', 'created_at', 'updated_at'];
                            if(row[0].length == 0) {
                                // insert_categories
                                insert_sql(config.tables['hc_categories'], category, columns).then( function(data_id) {
                                    console.log('uC DB 3a');
                                    callback2(null, all_categories);
                                });
                            } else {
                                var updated_at1 = new Date(row[0][0].updated_at.toString());
                                var updated_at2 = category['updated_at'].toString();

                                if(updated_at1.toISOString().substring(0,19) !== updated_at2.substring(0,19)) {
                                    update_sql(config.tables['hc_categories'], category, columns, row[0][0].id).then( function(data_id) {
                                        console.log('uC DB 3b');
                                        callback2(null, all_categories);
                                    });
                                } else {
                                    callback2(null, all_categories);
                                }
                            }

                        }, function (error) {
                            console.log(error);
                        });
                    } else {
                        callback2(null, all_categories);
                    }
                    
                    
                }, function done() {
                    console.log('Done');
                    deferred.resolve(all_categories);
                });

            }, function (error) {
                deferred.reject(new Error(error));
            });
    });

    req.end();
    req.on('error', function(e) {
        console.log('Ce eroare!!');
        console.log(e);
    });
    return deferred.promise;
}

function findDocument(content_id)
{
    var deferred = q.defer();
    var query = "SELECT jive_url FROM `" + config.tables['hc_articles'] + "` WHERE jive_content_id = '" + content_id + "' LIMIT 1";
    connection.query(query, deferred.makeNodeResolver());
    return deferred.promise;
}

function deleteRowsDB(table, zendesk_id)
{
    var deferred = q.defer();
    var query = "DELETE FROM `" + table + "` WHERE `zendesk_id` = '"+zendesk_id+"'";
    connection.query(query, deferred.makeNodeResolver());
    return deferred.promise;
}

function checkCategory(category_id)
{
    var deferred = q.defer();
    var query = "SELECT * " +
                "FROM `" + config.tables['hc_categories'] + "` " +
                "WHERE zendesk_id = '" + category_id + "'";
    connection.query(query, deferred.makeNodeResolver());
    return deferred.promise;
}

function checkSpaceInDb(jive_place_id)
{
    var deferred = q.defer();
    var query = "SELECT * " +
                "FROM `" + config.tables['hc_sections'] + "` " +
                "WHERE jive_place_id = '" + jive_place_id + "'";
    connection.query(query, deferred.makeNodeResolver());
    return deferred.promise;
}

function checkSection(section_id)
{
    var deferred = q.defer();
    var query = "SELECT * " +
                "FROM `" + config.tables['hc_sections'] + "` " +
                "WHERE zendesk_id = '" + section_id + "'";
    connection.query(query, deferred.makeNodeResolver());
    return deferred.promise;
}

function checkArticle(article_id)
{
    var deferred = q.defer();
    var query = "SELECT * " +
                "FROM `" + config.tables['hc_articles'] + "` " +
                "WHERE zendesk_id = '" + article_id + "'";
    connection.query(query, deferred.makeNodeResolver());
    return deferred.promise;
}

function getAllArticles()
{
    var deferred = q.defer();
    var query = "SELECT s.name as section_name, c.name as category_name, a.* " +
                "FROM `" + config.tables['hc_articles'] + "` as a " +
                "LEFT JOIN `" + config.tables['hc_sections'] + "` as s ON a.section_id = s.zendesk_id " +
                "LEFT JOIN `" + config.tables['hc_categories'] + "` as c ON s.category_id = c.zendesk_id ";
    connection.query(query, deferred.makeNodeResolver());
    return deferred.promise;
}

function getArticlesFromSectionId(section_id)
{
    var deferred = q.defer();
    var query = "SELECT  * " +
                "FROM `" + config.tables['hc_articles'] + "` " +
                "WHERE section_id = " + section_id;
    connection.query(query, deferred.makeNodeResolver());
    return deferred.promise;
}

function getSectionsFromCategoryId(category_id)
{
    var deferred = q.defer();
    var query = "SELECT  * " +
                "FROM `" + config.tables['hc_sections'] + "` " +
                "WHERE category_id = " + category_id;
    connection.query(query, deferred.makeNodeResolver());
    return deferred.promise;
}

function getArticlesFromSpaceId(space_id)
{
    var deferred = q.defer();
    var query = "SELECT  a.id as id, a.zendesk_id as zendesk_id, a.section_id as section_id, a.name as name, a.body as body, " +
                " a.jive_id as jive_id, a.jive_content_id as jive_content_id, s.name as section_name, a.jive_updated as jive_updated, " +
                " s.jive_place_id as jive_place_id, a.html_url as article_url " +
                "FROM `" + config.tables['hc_articles'] + "` as a " +
                "LEFT JOIN `" + config.tables['hc_sections'] + "` s ON a.section_id = s.zendesk_id " +
                "WHERE s.jive_place_id = " + space_id;
    connection.query(query, deferred.makeNodeResolver());
    return deferred.promise;
}

function allSections()
{
    var deferred = q.defer();
    var query = "SELECT  s.id as id, s.zendesk_id as zendesk_id, s.category_id as category_id, s.name as name, s.description as description, " +
                " s.jive_place_id as jive_place_id, s.jive_content_id as jive_content_id, s.jive_updated as jive_updated, c.name as category_name " +
                "FROM `" + config.tables['hc_sections'] + "` as s " +
                "LEFT JOIN `" + config.tables['hc_categories'] + "` c ON s.category_id = s.zendesk_id";
    connection.query(query, deferred.makeNodeResolver());
    return deferred.promise;
}

function allCategories()
{
    var deferred = q.defer();
    var query = "SELECT * " +
                "FROM `" + config.tables['hc_categories'] + "` ";
    connection.query(query, deferred.makeNodeResolver());
    return deferred.promise;
}

function insert_sql(table, data, columns, callback)
{
    var deferred = q.defer();
    var query = "INSERT INTO `" + table + "` (";
    for( var key in columns) {
        query += "`"+ columns[key] +"`,";
    }

    query = query.substr(0, query.length - 1) + ") VALUES (";

    for( var key1 in columns) {
        if(columns[key1] == 'zendesk_id') columns[key1] = 'id';
        query += connection.escape(data[columns[key1]]) + ",";
    }

    query = query.substr(0, query.length - 1) + ");";
    connection.query(query, function(err, result) {
      if (err) throw err;
      deferred.resolve(result.insertId);
    });

    deferred.promise.nodeify(callback);
    return deferred.promise;
}

function update_sql(table, data, columns, id, callback)
{
    var deferred = q.defer();
    var date_now = dateFormat(new Date().getTime(), '%Y-%m-%d %H:%M:%S');
    var sql = "UPDATE `" + table + "` SET ";
    for( var key in columns) {
        var key1 = columns[key];
        if(columns[key] == 'zendesk_id') columns[key] = 'id';
        sql += "`" + key1 + "` = " + connection.escape(data[columns[key]]) + ",";
    }
    sql = sql.substr(0, sql.length - 1) + " WHERE id = '" + id + "'";
    connection.query(sql, deferred.makeNodeResolver());
    return deferred.promise;
}

function dateFormat(date, fstr, utc)
{
    utc = utc ? 'getUTC' : 'get';
    return fstr.replace (/%[YmdHMS]/g, function (m) {
        switch (m) {
            case '%Y': return date[utc + 'FullYear'] (); // no leading zeros required
            case '%m': m = 1 + date[utc + 'Month'] (); break;
            case '%d': m = date[utc + 'Date'] (); break;
            case '%H': m = date[utc + 'Hours'] (); break;
            case '%M': m = date[utc + 'Minutes'] (); break;
            case '%S': m = date[utc + 'Seconds'] (); break;
            default: return m.slice (1); // unknown code, remove %
        }
        // add leading zero if required
        return ('0' + m).slice (-2);
    });
}

function jiveRequest(options, post_data, callback)
{
    var deferred = q.defer();
    var post_req = https.request(options, function(result) {
        result.setEncoding('utf8');
        var str = '';
        result.on('data', function(chunk) {
            str += chunk;
        });
        result.on('end', function() {
            if(str.substring(0, 9) == "<!DOCTYPE") {
                console.log('System Error');
                var ch = { erorr: { status: 404, message: 'System Error'}};
                deferred.resolve(ch);   
            } else {
                try {
                    var ch = JSON.parse(str);
                    deferred.resolve(ch); 
                } catch(err) {
                    console.log('Err:');
                    console.log(err);
                    console.log(str);
                }
            }
        });
    });
    post_req.on('error',function(err){
        console.log('Error');
        console.log(err);
        deferred.reject(err);
    });
    // post the data
    post_req.write(post_data);
    post_req.end();

    return deferred.promise;
}