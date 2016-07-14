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
        /*if (config.showLink && config.linkUrl === "") {
          setDefaultUrl(container.placeID, container.parent, config);
          }*/
        getQuestions(container.placeID);

        function getQuestions(placeID) {

            var reqQuestions = osapi.jive.corev3.contents.get({
                search: "accessing github",
                type: "discussion",
                count: 10
            });
            reqQuestions.execute(function(res) {
                if (res.error) {
                    var code = res.error.code;
                    var message = res.error.message;
                    console.log(code + " " + message);
                    // present the user with an appropriate error message
                } else {
                    var results = res.list;
                    var ul = document.getElementById("result-list");

                    for (r of results) {
                        var li = document.createElement("li");
                        var a = document.createElement("a");
                        a.setAttribute('target', "_top");
                        a.setAttribute('href', r.resources.html.ref);
                        var icon = document.createElement("span");
                        icon.classList.add(r.iconCss, "jive-icon-med");
                        var subj = document.createElement("span");
                        subj.classList.add("lnk");
                        subj.appendChild( document.createTextNode(r.subject) );
                        var em = document.createElement("em");
                        emText = document.createTextNode("asked by " + r.author.displayName + " on " + "Date");
                        em.appendChild(emText);

                        a.appendChild(icon);
                        a.appendChild(subj);
                        a.appendChild(em);
                        li.appendChild(a);
                        ul.appendChild(li);
                    }
                    gadgets.window.adjustHeight();
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
