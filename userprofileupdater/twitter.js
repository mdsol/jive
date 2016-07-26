var request = require("request");
var fs = require("fs");
var config = require("./config.json");


var twitCSV = fs.readFileSync("./twitter-handles.csv", "utf8");
var twitHandles = twitCSV.trim().split("\n");

for (var line of twitHandles) {
    var split = line.split(",");
    editTwitter(split[0], split[1]);
}

function editTwitter(email, twit) {
    request.get({
        url: config.jiveURL + "/api/core/v3/people/email/" + email,
        auth: config.auth
    }, function(error, message, res) {
        var data = JSON.parse(res);
        if (data.error) {
            console.log(data.error.message);
            return;
        }

        var profile = data.jive.profile;

        var twitFound = false;
        for (var obj of profile) {
            if (obj.jive_label === "Twitter") {
                obj.value = twit;
                twitFound = true;
                break;
            }
        }
        if (!twitFound) {
            profile.push({
                jive_label: "Twitter",
                value: twit
            });
        }

        // send updated data back to Jive
        request.put({
            url: config.jiveURL + "/api/core/v3/people/" + data.id,
            auth: config.auth,
            json: true,
            body: data
        }, function (error, message, res) {
            console.log(email + ": " + message.statusMessage);
        });
    });
}
