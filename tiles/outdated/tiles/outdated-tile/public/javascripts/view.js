// flag for recording time and logging to console
var timer = false;

// how many pixels to cut off from bottom of widget
var shrinkByLink = 10;
var shrinkByNoLink = 27;

// 0-11 mapped to month name
var months = [
    "January"  , "February", "March"   , "April",
    "May"      , "June"    , "July"    , "August",
    "September", "October" , "November", "December"
];

// default url endings
var defaultUrlThis = "/content?filterID=contentstatus%5Bpublished%5D~objecttype~showall~action~action%5Boutdated%5D";
var defaultUrlAll = "/content?filterID=all~objecttype~showall~action~action%5Boutdated%5D";

jive.tile.onOpen(function(config, options) {
 console.log('--------------------OutDated-Content----------------------');
    console.log("OutDated - config",config,"options", options);
    
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
        console.log('OutDated - container',container);
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
                        var options = {
                            count: 100, // most likely not more than 100
                            filter: "type(space,project,group)"
                        }
                        res.getPlaces(options).execute(function(res) {
                            if (res.error) {
                                var code = res.error.code;
                                var message = res.error.message;
                                console.log(code + " " + message);
                                // present the user with an appropriate error message
                            } else {
                                var resList = res.list;
                                for (place of resList) {
                                    getOutdated(place.placeID);
                                }
                                pending--;
                                if (pending == 0) {
                                    if (timer) {
                                        lap = Date.now();
                                        console.log("OutDated - getOutdated " + (lap - start) + " ms");
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
                sort: "latestActivityDesc",
                fields: "subject,author.displayName,iconCss,lastActivity,published"
            }
            if (config.place === "sub" || config.place === "this") {
                reqOptions.place = "/places/" + placeID;
                console.log('OutDated - reqOptions-if sub-this',reqOptions);
            }
            console.log('OutDated- reqOptions',reqOptions);
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
                        console.log("OutDated - request content from " + placeID + ": " + (Date.now() - reqTime) + " ms");
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
                            console.log("OutDated - getOutdated " + (lap - start) + " ms");
                        }
                        showDocs();
                    }
                }
            });
        }
        
        function setDefaultUrl(placeID, parentUrl, config) {
            console.log('OutDated - placeID: ',placeID,'parentUrl: ', parentUrl,'config: ', config);
            
            if (config.place === "all") {
                if (config.linkUrl === "") {
                        //config.linkUrl = container.resources.html.ref + defaultUrlAll;
                           var parentUrl = container.resources.html.ref;
                           var endOfBaseUrl = parentUrl.indexOf("/", "https://".length);
                           console.log('endOfBaseUrl::::',endOfBaseUrl);
                           config.linkUrl = parentUrl.substring(0, endOfBaseUrl);
                           console.log('config.linkUrl - 1::: ',config.linkUrl);
                           config.linkUrl += defaultUrlAll;
                           console.log('config.linkUrl - 2::: ',config.linkUrl);
                    }else{
                            var endOfBaseUrl = parentUrl.indexOf("/", "https://".length);
                            config.linkUrl = parentUrl.substring(0, endOfBaseUrl);
                            config.linkUrl += defaultUrlAll;
                    }
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
                        console.log(config.linkUrl +" :: "+res.resources.html.ref+" : "+defaultUrlThis);
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
            var monthStr = months[date.getMonth()].substring(0, 3);
            var yearStr = date.getFullYear() + "";

            return dateStr + "-" + monthStr + "-" + yearStr;
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
