jive.tile.onOpen(function(config, options) {
    jive.tile.getContainer(function(container) {
        jive.tile.getExtendedProps(function(props) {
            // default config vals if no values given
            config.numResults = config.numResults || 6;
            config.place = config.place || "this";
            config.sort = config.sort || "scoreDesc"
                if (config.showLink === undefined) { config.showLink = true; }
            config.linkText = config.linkText || "See More Ideas";
            config.linkUrl = config.linkUrl || container.resources.html.ref + "/content?filterID=contentstatus%5Bpublished%5D~objecttype~objecttype%5Bidea%5D&sortKey=contentstatus%5Bpublished%5D~objecttype~objecttype%5Bidea%5D~ideaScoreDesc&sortOrder=0";

            // 0-11 mapped to month name
            var months = [
                "January"  , "February", "March"   , "April",
                "May"      , "June"    , "July"    , "August",
                "September", "October" , "November", "December"
            ];

            var emptyFunc = function() {}; // does nothing

            var places = [];
            var ideaList = [];

            var sortFns = {
                "scoreDesc": function(a, b) { return b.score - a.score; },
                "scoreAsc": function(a, b) { return a.score - b.score; },
                "votesDesc": function(a, b) { return b.voteCount - a.voteCount; },
                "votesAsc": function(a, b) { return a.voteCount - b.voteCount; }
            };

            getIdeas();

            if (config.place === "sub") {
                var pending = 0;
                getSubplaces(container);
            }

            function getSubplaces(container) {
                // get sub-places of this place
                pending++;
                var options = {
                    count: 100, // most likely not more than 100
                    fields: "placeID",
                    filter: "type(space,project,group)"
                }
                container.getPlaces(options).execute(function(res) {
                    if (res.error) {
                        var code = res.error.code;
                        var message = res.error.message;
                        console.log(code + " " + message);
                        // present the user with an appropriate error message
                    } else {
                        for (place of res.list) {
                            getSubplaces(place);
                            places.push("/places/" + place.placeID);
                        }
                        pending--;
                        if (pending === 0) {
                            jive.tile.updateExtendedProps({"places": places.join(",")}, emptyFunc);
                            if (props.places === undefined) {
                                props.places = places.join(",");
                                getIdeas();
                            }
                        }
                    }
                });
            }

            function getIdeas(startIndex = 0) {
                if (config.place === "sub" && props.places === undefined) {
                    return;
                }

                var reqOptions = {
                    count: config.numResults,
                    startIndex: startIndex,
                    type: "idea",
                    fields: "subject,author.displayName,lastActivityDate,published,stage,score,voteCount,voted,promote,content.text"
                }

                if (config.sort in sortFns) {
                    reqOptions.count = 100;
                } else {
                    reqOptions.sort = config.sort;
                }
                // add place if not "all places"
                if (config.place !== "all") {
                    reqOptions.place = "/places/" + container.placeID;
                    if (config.place === "sub") {
                        reqOptions.place += "," + props.places;
                    }
                }
                var reqContent = osapi.jive.corev3.contents.get(reqOptions);
                reqContent.execute(function(res) {
                    if (res.error) {
                        var code = res.error.code;
                        var message = res.error.message;
                        console.log(code + " " + message);
                        // present the user with an appropriate error message
                    } else {
                        for (let el of res.list) {
                            ideaList.push({
                                subject: el.subject,
                                url: el.resources.html.ref,
                                author: el.author.displayName,
                                authorUrl: el.author.resources.html.ref,
                                lastAct: el.lastActivityDate,
                                postDate: el.published,
                                stage: el.stage,
                                score: el.score,
                                voteCount: el.voteCount,
                                voted: el.voted,
                                promote: el.promote,
                                content: el.content.text,
                                voteUp: el.voteUp,
                                voteDown: el.voteDown
                            });
                        }

                        if (res.getNextPage && !reqOptions.sort) {
                            getIdeas(startIndex + 100);
                        } else {
                            showIdeas();
                        }
                    }
                });
            }

            function showIdeas() {
                if (config.sort in sortFns) {
                    ideaList.sort(sortFns[config.sort]);
                }

                var container = document.getElementById("idea-list");

                for (let i = 0; i < config.numResults && i < ideaList.length; i++) {
                    let idea = ideaList[i];
                    if (i > 0) {
                        container.appendChild( document.createElement("hr") );
                    }

                    let outerDiv = document.createElement("div");
                    container.appendChild(outerDiv);

                    let left = outerDiv.cloneNode(false);
                    left.classList.add("col-sm-2", "left");
                    let right = outerDiv.cloneNode(false);
                    right.classList.add("col-sm-10", "right");
                    outerDiv.appendChild(left);
                    outerDiv.appendChild(right);

                    // score block
                    let scoreBlock = document.createElement("div");
                    scoreBlock.classList.add("score-block");
                    left.appendChild(scoreBlock);

                    let scoreNum = document.createElement("div");
                    scoreNum.classList.add("score-num");
                    scoreNum.textContent = idea.score;
                    scoreBlock.appendChild(scoreNum);
                    let scoreExclUser = idea.score - (idea.promote ? 1 : 0); // excl user vote

                    if (idea.stage === "Active") {
                        let updownvote = document.createElement("div");
                        updownvote.classList.add("vote");
                        scoreBlock.appendChild(updownvote);

                        let upvote = document.createElement("span");
                        updownvote.appendChild(upvote);
                        let downvote = document.createElement("span");
                        updownvote.appendChild(downvote);

                        upvote.classList.add("glyphicon", "glyphicon-menu-up", "upvote");
                        upvote.setAttribute("role", "button");
                        let upfunc = function() {
                            idea.voteUp().execute(emptyFunc);
                            upvote.classList.add("selected");
                            downvote.classList.remove("selected");
                            upvote.removeAttribute("role");
                            downvote.setAttribute("role", "button");
                            scoreNum.textContent = scoreExclUser + 1;
                        }
                        upvote.addEventListener("click", upfunc);

                        downvote.classList.add("glyphicon", "glyphicon-menu-down", "downvote");
                        downvote.setAttribute("role", "button");
                        let downfunc = function() {
                            idea.voteDown().execute(emptyFunc);
                            downvote.classList.add("selected");
                            upvote.classList.remove("selected");
                            downvote.removeAttribute("role");
                            upvote.setAttribute("role", "button");
                            scoreNum.textContent = scoreExclUser;
                        }
                        downvote.addEventListener("click", downfunc);

                        if (idea.voted) {
                            let sel = idea.promote ? upvote : downvote;
                            sel.classList.add("selected");
                            sel.removeAttribute("role");
                        }

                        scoreNum.style.width = "calc(70% - 2px)";
                        scoreNum.style.borderTopRightRadius = "0";
                        scoreNum.style.borderBottomRightRadius = "0";
                    }

                    let stage = document.createElement("span");
                    stage.classList.add("idea-stage");
                    if (idea.stage === "Active" || idea.stage === "For future consideration") {
                        stage.classList.add("green-status");
                    } else if (idea.stage === "In progress" || idea.stage === "Partially implemented") {
                        stage.classList.add("yellow-status");
                    }
                    stage.textContent = idea.stage;
                    scoreBlock.appendChild(stage);

                    let voteCount = document.createElement("span");
                    voteCount.textContent = idea.voteCount + " votes";
                    scoreBlock.appendChild(voteCount);

                    let header = document.createElement("h2");
                    let subjectLink = document.createElement("a");
                    subjectLink.setAttribute("target", "_top");
                    subjectLink.setAttribute("href", idea.url);
                    subjectLink.textContent = fixFormatting(idea.subject);
                    header.appendChild(subjectLink);
                    right.appendChild(header);

                    let details = document.createElement("div");
                    details.appendChild( document.createTextNode("Created on " + formatDate(idea.postDate) + " by ") );
                    let authorLink = document.createElement("a");
                    authorLink.setAttribute("target", "_top");
                    authorLink.setAttribute("href", idea.authorUrl);
                    authorLink.textContent = idea.author;
                    details.appendChild(authorLink);
                    details.appendChild( document.createTextNode(" - Last Modified: " + formatDate(idea.lastAct)) );
                    right.appendChild(details);

                    let content = document.createElement("div");
                    content.classList.add("content");
                    let p = document.createElement("p");
                    p.textContent = truncate( fixFormatting(idea.content), 500 );
                    content.appendChild(p);
                    right.appendChild(content);
                }

                setLink(); // set "See More" link

                document.getElementById("loading").style.display = "none";
                gadgets.window.adjustHeight();

            }

            /*
             * Delete tags and replace HTML codes
             */
            function fixFormatting(str) {
                str = str.replace(/<[^>]+>/g, " "); // replace tags with a space
                str = str.replace(/&#160;/g, " "); // replace space code with space
                str = str.replace(/&amp;/g, "&"); // replace amp code with &
                str = str.replace(/&lt;/g, "<"); // replace lt code with <
                str = str.replace(/&gt;/g, ">"); // replace gt code with >
                str = str.replace(/\s{2,}/g, " "); // compact multiple spaces to 1
                return str;
            }

            /*
             * If str is longer than numChars characters, truncates str until the
             * last space before the numChars character and adds an ellipsis
             */
            function truncate(str, numChars) {
                if (str.length < numChars) {
                    return str;
                }

                var index = str.lastIndexOf(" ", numChars);
                if (index === -1) {
                    index = numChars;
                }
                return str.substr(0, index) + " …";
            }

            function formatDate(rawDate) {
                var date = new Date(rawDate);
                dateStr = "";
                dateStr += months[date.getMonth()].substr(0,3) + " ";
                dateStr += date.getDate() + ", ";
                dateStr += date.getFullYear() + " ";

                var hour = date.getHours();
                var ampm = "AM";
                var min = date.getMinutes();

                if (hour >= 12) {
                    ampm = "PM";
                    hour -= 12;
                }
                if (hour === 0) {
                    hour = 12;
                }
                if (min < 10) {
                    min = "0" + min
                }
                dateStr += hour + ":" + min + " " + ampm;
                return dateStr;
            }

            function setLink() {
                if (config.showLink) {
                    var link = document.getElementById("link");
                    link.textContent = config.linkText;
                    link.setAttribute("href", config.linkUrl);
                    link.style.display = "inline";
                }
            }
        });
    });
});
