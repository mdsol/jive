// flag for recording time and logging to console
var timer = false;
var start, lap;

// post a question URL
var questionUrl = "/discussion/create.jspa?question=true&containerType=14";

// array of placeIDs of subplaces prepended with "/places/"
var places = [];

// array of question search results
var results = [];

jive.tile.onOpen(function(config, options) {
    gadgets.window.adjustHeight();

    // set defaults for config
    config.numResults = config.numResults || 10;
    config.qType = config.qType || "all";
    config.place = config.place || "all";

    jive.tile.getContainer(function(container) {

        places.push("/places/" + container.placeID);
        if (config.place === "sub") {
            getSubplaces(container.placeID);
        }

        $("#question-input").on("input", function(e) {
            if (timer) {
                start = Date.now();
            }
            getQuestions($(this).val());
        });

        $("#ask").click(function(e) {
            var parser = document.createElement("a");
            parser.href = container.parent;

            var url = parser.origin + questionUrl;
            url += "&containerID=" + container.id;
            url += "&subject=" + $("#question-input").val();

            parent.window.location = url;
        });

        function getSubplaces(placeID) {
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
                                places.push("/places/" + place.placeID);
                                getSubplaces(place.placeID);
                            }
                        }
                    });
                }
            });
        }

        function getQuestions(query, startIndex = 0) {

            // hide the ask button
            $("#ask").hide();

            // hide results if no query
            if (query === "") {
                clearResults();
                hideLoading();
                gadgets.window.adjustHeight();
                return;
            } else {
                $("#no-results-msg").hide();
            }

            // make room for loading icon
            if ($("#result-list").children().length === 0) {
                gadgets.window.adjustHeight( 2*gadgets.window.getHeight() );
            }
            showLoading();

            options = {
                search: query,
                type: "discussion",
                count: 100,
                fields: "question,resolved,subject,author.displayName,published,iconCss",
                startIndex: startIndex
            }
            if (config.place !== "all") {
                options.place = places.join(",");
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
                    if (query !== $("#question-input").val()) {
                        return;
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
            clearResults();

            for (var r of results) {
                var li = document.createElement("li");
                var a = document.createElement("a");
                a.setAttribute("target", "_top");
                a.setAttribute("href", r.resources.html.ref);
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
            $("#ask").show();

            if (results.length === 0) {
                $("#no-results-msg").show();
            }

            results = [];
            hideLoading();

            if (timer) {
                console.log("creating nodes took " + (Date.now() - lap) + " ms");
            }
            gadgets.window.adjustHeight();
        }

        function formatDate(dateStr) {
            var date = new Date(dateStr);
            return (date.getMonth()+1) + "/" + date.getDate() + "/" + date.getFullYear();
        }

        function showLoading() {
            $("#loading").show();
            $("#result-list").css("opacity", 0.5);
        }

        function hideLoading() {
            $("#loading").hide();
            $("#result-list").css("opacity", 1);
        }

        function clearResults() {
            var ul = document.getElementById("result-list");
            while (ul.hasChildNodes()) {
                ul.removeChild(ul.lastChild);
            }
        }
    });
});
