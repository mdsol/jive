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
    var region  = '';

    switch(hour_now)
    {
        case '00':
            region = 'APAC';
            break;
        case '08':
            region = 'EMEA';
            break;
        default:
            region = 'all';
            break;
    }

    var next_page = config.url_type + config.basicUrl + config.peopleUrl + '?filter=include-disabled(false)';

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
                                if(profile.value == region) {
                                    region_status = true;
                                } else if(region == 'all') {
                                    if(profile.value != 'EMEA' && profile.value != "APAC") {
                                        region_status = true;
                                    }
                                }
                                break;
                            case "Employee Type":
                                if(!(profile.value == "Contingent Worker" || profile.value == "On leave")) {
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

                        if(employee_type == true && employee_status == true && birthday_today == true && region_status == true) {
                            
                            var parent_url = config.placeUrl + '/' + config.placeId;

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
                                    path: config.contentUrl,
                                    port: 443,
                                    method: 'POST',
                                    headers: {
                                        'X-Jive-Run-As' : 'email ' + username,
                                        'Authorization' : config.basicAuth,
                                        'Content-Type'  : 'application/json'
                                    }
                            };
                            var post_data = JSON.stringify(doc_data);
                            jiveRequest(options, post_data).then(function(response) {
                                console.log(username);
                            }, function (error) {
                                console.log('Eroare!!');
                                console.log(error);
                                throw error;
                            });
                        }
                        callback1(null, person);
                    });
                    
                }, function (error) {
                    console.log('Eroare!!');
                    console.log(error);
                    throw error;
                });

            }, function done() {
                if(typeof people.links.next == 'undefined') {
                    next_page = false;
                } else {
                    next_page = people.links.next;
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
        console.log('Ce eroare!!');
        console.log(e);
    });
    return deferred.promise;
}