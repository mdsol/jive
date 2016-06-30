// flag for recording time and logging to console
var timer = false;

jive.tile.onOpen(function(config, options) {

    config.title = config.title || "Recent Outdated Content";
    config.numDocs = config.numDocs || 10;
    config.place = config.place || "sub";

    jive.tile.getContainer(function(container) {
        var docList = [];
        var pending = 0;
        if (timer) {
            var start = Date.now(), lap;
        }
        getOutdated(container.placeID);

        function getOutdated(placeID) {
            // get sub-places of this place
            if (config.place === "sub") {
                var reqSubspace = osapi.jive.corev3.places.get({
                    uri: "/places/" + placeID
                });
                pending++;
                reqSubspace.execute(function(res) {
                    if (res.error) {
                        var code = res.error.code;
                        var message = res.error.message;
                        console.log(code + " " + message);
                        // present the user with an appropriate error message
                    } else {
                        res.getPlaces().execute(function(res) {
                            if (res.error) {
                                var code = res.error.code;
                                var message = res.error.message;
                                console.log(code + " " + message);
                                // present the user with an appropriate error message
                            } else {
                                var resList = res.list;
                                for (place of resList) {
                                    if (place.type !== "blog") {
                                        getOutdated(place.placeID);
                                    }
                                }
                                pending--;
                                if (pending == 0) {
                                    if (timer) {
                                        lap = Date.now();
                                        console.log("getOutdated " + (lap - start) + " ms");
                                    }
                                    showDocs();
                                }
                            }
                        });
                    }
                });
            }

            // get the outdated content
            var reqOptions = {
                outcomeType: "outdated",
                count: config.numDocs,
                sort: "latestActivityDesc"
            }
            if (config.place === "sub" || config.place === "this") {
                reqOptions.place = "/places/" + placeID;
            }
            var reqContent = osapi.jive.corev3.contents.get(reqOptions);
            pending++;
            if (timer) {
                var reqTime = Date.now();
            }
            reqContent.execute(function(res) {
                if (res.error) {
                    var code = res.error.code;
                    var message = res.error.message;
                    console.log(code + " " + message);
                    // present the user with an appropriate error message
                } else {
                    if (timer) {
                        console.log("request content from " + placeID + ": " + (Date.now() - reqTime) + " ms");
                    }
                    for (let el of res.list) {
                        docList.push({
                            subject: el.subject,
                            url: el.resources.html.ref,
                            icon: el.iconCss,
                            lastAct: el.lastActivity
                        });
                    }
                    pending--;
                    if (pending == 0) {
                        if (timer) {
                            lap = Date.now();
                            console.log("getOutdated " + (lap - start) + " ms");
                        }
                        showDocs();
                    }
                }
            });
        }

        function showDocs() {
            // sort by reverse chronological order if needed
            if (config.place === "sub") {
                docList.sort(function(a, b) {
                    return b.lastAct - a.lastAct;
                });
            }

            var ul = document.getElementById("ul-list");

            for (var i = 0; i < docList.length; i++) {
                var doc = docList[i];

                // create link as list element
                var li = document.createElement("li");
                li.setAttribute('class', "listItem showIcon");
                var a = document.createElement("a");
                a.setAttribute('target', "_top");
                a.setAttribute('href', doc.url);

                // create icon and text
                var icon = document.createElement('span');
                icon.setAttribute('class', doc.icon + " jive-icon-med");
                var docSubj = document.createTextNode(doc.subject);

                a.appendChild(icon);  
                a.appendChild(docSubj);
                li.appendChild(a);  

                ul.appendChild(li);
            }
            $(".glyphicon-refresh").hide();

            if (timer) {
                console.log("showDocs " + (Date.now() - lap) + " ms");
            }
            gadgets.window.adjustHeight();
        }

    });
});

// resize tile if the window changes size (responsive)
$(window).resize(function() {
    gadgets.window.adjustHeight();
});
