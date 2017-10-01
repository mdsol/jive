//Load the request module
var config  = require('./config');
var q       = require('q');
var https   = require('https');
var async   = require('async');

anniversary();
function anniversary()
{
    var date_now     = dateFormat(new Date(), "%m/%d/%Y", true);
    var hour_now     = dateFormat(new Date(), "%H", true);
    var region       = '';

    if(typeof process.argv.slice(2)[0] !== 'undefined') {
        region = process.argv.slice(2)[0];
    } else {
        console.log("No region was selected");
    }


    var next_page = config.url_type + config.basicUrl + config.peopleApiUrl + '?filter=include-disabled(false)';
    findPlaceId(config).then(function(place_id) {
        console.log(place_id);
        if(place_id !== "") {
            async.doWhilst(function (callback) {
                sendGetData(next_page).then(function(people) {

                    async.eachSeries(people.list, function iterator(person_data, callback1) {
                        var username_url = config.url_type + config.basicUrl + config.apiCore + 'people/username/' + person_data.jive.username + '?-resources';

                        sendGetData(username_url).then(function(person) {
                            var anniversary_name = person.displayName;
                            var employee_type    = false;
                            var employee_status  = false;
                            var birthday_today   = false;
                            var year_no          = false;
                            var region_status    = false;

                            async.eachSeries(person.jive.profile, function iterator(profile, callback2) {
                                switch(profile.jive_label) {
                                    case "Region":
                                        if(region == "") {
                                            region_status = true;
                                        } else {
                                            if(profile.value == region) {
                                                region_status = true;
                                            }
                                        }
                                        break;
                                    case "Employee Type":
                                        if(profile.value !== "Contingent Worker" && profile.value !== "On leave") {
                                            employee_type = true;
                                        }
                                        break;
                                    case "Employee Status":
                                        if(profile.value == "Active") {
                                            employee_status = true;
                                        }
                                        break;
                                    case "Hire Date":
                                        var current_year = dateFormat(new Date(), "%Y", true);
                                        year_no = current_year - profile.value.substr(profile.value.length - 4);
                                        profile.value = dateFormat(new Date(profile.value), "%m/%d/%Y", true);
                                        
                                        if(profile.value.substr(0,2) == date_now.substr(0,2)) {
                                            console.log(profile.value.substr(0,5));
                                            console.log(date_now.substr(0,5));
                                        }
                                        if(profile.value.substr(0,5) == date_now.substr(0,5) && year_no != 0) {
                                            birthday_today = true;
                                            console.log(person_data.jive.username);
                                            console.log("Hire date anniversary");
                                            console.log(profile.value);
                                        }
                                        break;
                                }
                                callback2(null, year_no);

                            }, function done() {
                                console.log('***');
                                if(employee_type == true && employee_status == true && birthday_today == true && region_status == true) {
                                    
                                    var parent_url = config.placeApiUrl + '/' + place_id;

                                    var yr = 'years';
                                    if(year_no == 1) yr = 'year';
                                    var content = "<body> " + anniversary_name + " celebrated " + year_no + " " + yr + " at Steel Inc. today. <p></p><p><em>Posted by UserBot​</em></p></body>"

                                    var doc_data = {
                                        'visibility'   : 'place',
                                        'parent'       : parent_url,
                                        'type'         : 'update',
                                        'content'      : {
                                            'type' : 'text/html',
                                            'text' : content
                                        }
                                    };

                                    var username = person_data.jive.username;

                                    //status update available only in groups
                                    var options = {
                                            hostname: config.basicUrl,
                                            path: config.contentApiUrl,
                                            port: 443,
                                            method: 'POST',
                                            headers: {
                                                'X-Jive-Run-As' : 'userid ' + person.id,
                                                'Authorization' : config.basicAuth,
                                                'Content-Type'  : 'application/json'
                                            }
                                    };
                                    var post_data = JSON.stringify(doc_data);
                                    jiveRequest(options, post_data).then(function(response) {
                                        if(typeof response.error !== "undefined") {
                                            console.log(username + ':' + response.error.message);
                                        } else {
                                            console.log(username + ': Status was updated!');
                                        }
                                        callback1(null, person);
                                    }, function (error) {
                                        console.log('Error!!');
                                        console.log(error);
                                        throw error;
                                    });
                                } else {
                                    callback1(null, person);
                                }
                                
                            });
                            
                        }, function (error) {
                            console.log('Error!!');
                            console.log(error);
                            throw error;
                        });

                    }, function done() {
                        if(typeof people.links !== 'undefined') {
                            if(typeof people.links.next == 'undefined') {
                                next_page = false;
                            } else {
                                next_page = people.links.next;
                            }
                        } else {
                            next_page = false;
                        }
                        callback(null, next_page);
                    });
                    
                }, function (error) {
                    console.log('Eroare!!');
                    console.log(error);
                    throw error;
                });
            }, function () {
                return next_page !== false;
            }, function done() {
                console.log('done');
            });

        } else {
            console.log('We can find place id. Make sure the place url is correct');
            process.exit();
        }
    });
}

function findPlaceId(config, callback)
{
    var deferred = q.defer();
    var placeName = config.placeUrl.split("/").pop();
    var placeId   = "";
    var new_parent_url = config.url_type + config.basicUrl + config.placeApiUrl + "/?filter=search(" + placeName + ")";
    console.log(placeName);
    sendGetData(new_parent_url).then(function(new_space_data) {
        async.eachSeries(new_space_data.list, function iterator(space, callback1) {
            console.log(space.resources.html.ref);

            if(config.placeUrl == space.resources.html.ref) {
                placeId = space.placeID;
            }
            callback1(null, space);
        }, function done() {
            console.log("Place id: " + placeId);
            deferred.resolve(placeId);
            
        });
    }, function (error) {
        deferred.reject(new Error('No space'));
        console.log('Handle error: ' + error.stack);
        throw error;
    });
    return deferred.promise;
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
                    console.log('Response: ');
                    deferred.resolve(ch); 
                } catch(err) {
                    console.log('Err:');
                    console.log(err);
                }
            }
        });
    });
    // post the data
     var rsp = post_req.write(post_data);
    post_req.write(post_data);
    post_req.end();

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

function sendGetData(url, callback)
{
    var deferred = q.defer();
    var data = {
            host:    config.basicUrl,
            port:    443,
            path:    url,
            method:  'GET',
            headers: {
                'Authorization': config.basicAuth,
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
        console.log('Error: ');
        console.log(e);
    });
    return deferred.promise;
}
