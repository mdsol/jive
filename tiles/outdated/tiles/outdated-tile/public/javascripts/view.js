// flag for recording time and logging to console
var timer = false;

// how many pixels to cut off from bottom of widget
var shrinkByLink = 10;
var shrinkByNoLink = 27;

// default url endings
var defaultUrlThis = "/content?filterID=contentstatus%5Bpublished%5D~objecttype~showall~action~action%5Boutdated%5D";
var defaultUrlAll = "/content?filterID=all~objecttype~showall~action~action%5Boutdated%5D";
jive.tile.onOpen(function(config, options) {

    config.title = config.title || "Recent Outdated Content";
    config.numDocs = config.numDocs || 10;
    config.place = config.place || "sub";
    config.showLink = config.showLink === undefined ? true : config.showLink;
    config.linkText = config.linkText || "See More Outdated Content";
    config.linkUrl = config.linkUrl || "";

    // resize tile if the window changes size (responsive)
    $(window).resize(function() {
        resize(config.showLink);
    });

    // resizes window
    function resize(showLink) {
        var shrinkBy = showLink ? shrinkByLink : shrinkByNoLink;
        gadgets.window.adjustHeight( gadgets.window.getHeight() - shrinkBy );
    }

    jive.tile.getContainer(function(container) {
        var docList = [];
        var pending = 0;
        if (timer) {
            var start = Date.now(), lap;
        }
        if (config.showLink && config.linkUrl === "") {
            setDefaultUrl(container.placeID, container.parent, config);
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
                            author: el.author.displayName,
                            authorUrl: el.author.resources.html.ref,
                            icon: el.iconCss,
                            avatar: el.author.resources.avatar.ref,
                            lastAct: el.lastActivity,
                            postDate: el.published
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
        
        function setDefaultUrl(placeID, parentUrl, config) {
            if (config.place === "all") {
                var endOfBaseUrl = parentUrl.indexOf("/", "https://".length);
                config.linkUrl = parentUrl.substring(0, endOfBaseUrl);
                config.linkUrl += defaultUrlAll;
            } else {
                var reqSubspace = osapi.jive.corev3.places.get({
                    uri: "/places/" + placeID
                });
                reqSubspace.execute(function(res) {
                    if (res.error) {
                        var code = res.error.code;
                        var message = res.error.message;
                        console.log(code + " " + message);
                        // present the user with an appropriate error message
                    } else {
                        config.linkUrl = res.resources.html.ref + defaultUrlThis;
                    }
                });
            }
        }

        function formatDate(date) {
            var dateStr = date.getDate() + "";
            if (dateStr.length < 2) {
                dateStr = "0" + dateStr;
            }
            var monthStr = (date.getMonth() + 1) + "";
            if (monthStr.length < 2) {
                monthStr = "0" + monthStr;
            }
            var yearStr = date.getFullYear() + "";

            return dateStr + "/" + monthStr + "/" + yearStr;
        }

        function showDocs() {
            // sort by reverse chronological order if needed
            if (config.place === "sub") {
                docList.sort(function(a, b) {
                    return b.lastAct - a.lastAct;
                });
            }

            var ul = document.getElementById("ul-list");
            var table = document.getElementById("content-table");
            var link = document.getElementById("link");

            for (var doc of docList) {
                // create list node
                var li = document.createElement("li");
                li.classList.add("listItem", "showIcon");
                var a = document.createElement("a");
                a.setAttribute('target', "_top");
                a.setAttribute('href', doc.url);
                var icon = document.createElement('span');
                icon.classList.add(doc.icon, "jive-icon-med");
                var docSubj = document.createTextNode(doc.subject);
                a.appendChild(icon);  
                a.appendChild(docSubj);
                li.appendChild(a);  
                ul.appendChild(li);
                
                // create table row node
                var tr = document.createElement("tr");
                var td1 = document.createElement("td");
                var td2 = td1.cloneNode(), td3 = td1.cloneNode();
                td1.appendChild(a.cloneNode(true));
                var authorUrl = a.cloneNode();
                authorUrl.setAttribute("href", doc.authorUrl);
                var avatar = document.createElement("img");
                avatar.classList.add("img-circle", "avatar");
                avatar.setAttribute("src", doc.avatar);
                avatar.setAttribute("height", "30px");
                authorUrl.appendChild(avatar);
                var author = document.createTextNode(doc.author);
                authorUrl.appendChild(author);
                td2.appendChild(authorUrl);
                var postDate = new Date(doc.postDate);
                var postDateNode = document.createTextNode(formatDate(postDate));
                td3.appendChild(postDateNode);
                tr.appendChild(td1);
                tr.appendChild(td2);
                tr.appendChild(td3);
                table.appendChild(tr);
            }
            if (config.showLink) {
                link.setAttribute("href", config.linkUrl);
                var linkText = document.createTextNode(config.linkText);
                link.appendChild(linkText);
            }
            $(".glyphicon-refresh").hide();

            if (timer) {
                console.log("showDocs " + (Date.now() - lap) + " ms");
            }
            resize(config.showLink);
        }

    });
});
