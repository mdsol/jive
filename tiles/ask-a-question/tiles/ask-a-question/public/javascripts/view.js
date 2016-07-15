// flag for recording time and logging to console
var timer = false;
var start, lap;

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
    gadgets.window.adjustHeight();

    // set defaults for config
    config.numResults = config.numResults || 10;
    config.qType = config.qType || "all";
    config.place = config.place || "all";

    jive.tile.getContainer(function(container) {
        var results = [];
        var pending = 0;

        $("#question-input").keypress(function(e) {
            if (e.which == 13) {
                if (timer) {
                    start = Date.now();
                }
                getQuestions($(this).val());
            }
        })

        function getQuestions(query, startIndex = 0) {

            options = {
                search: query,
                type: "discussion",
                count: 100,
                fields: "question,resolved,subject,author.displayName,published,iconCss",
                startIndex: startIndex
            }
            if (config.place === "this") {
                options.place = "/places/" + container.placeID;
            }
            
            osapi.jive.corev3.contents.get(options).execute(function(res) {
                if (res.error) {
                    var code = res.error.code;
                    var message = res.error.message;
                    console.log(code + " " + message);
                    // present the user with an appropriate error message
                } else {
                    if (timer) {
                        lap = Date.now();
                        console.log("query took " + (lap - start) + " ms");
                    }

                    for (var r of res.list) {
                        if (r.question && (config.qType === "all" || r.resolved.indexOf(config.qType) !== -1)) {
                            results.push(r);
                        }
                        if (results.length === config.numResults) {
                            break;
                        }
                    }

                    if (res.links && res.links.next && results.length < config.numResults) {
                        getQuestions(query, startIndex + 100);
                    } else {
                        showResults();
                    }
                }
            });
        }

        function showResults() {
            var ul = document.getElementById("result-list");

            // remove existing results
            while (ul.hasChildNodes()) {
                ul.removeChild(ul.lastChild);
            }

            for (var r of results) {
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
                emText = document.createTextNode("asked by " + r.author.displayName + " on " + formatDate(r.published));
                em.appendChild(emText);

                a.appendChild(icon);
                a.appendChild(subj);
                a.appendChild(em);
                li.appendChild(a);
                ul.appendChild(li);
            }

            results = [];

            if (timer) {
                console.log("creating nodes took " + (Date.now() - lap) + " ms");
            }
            gadgets.window.adjustHeight();
        }

        function formatDate(dateStr) {
            var date = new Date(dateStr);
            return (date.getMonth()+1) + "/" + date.getDate() + "/" + date.getFullYear();
        }

    });
});
