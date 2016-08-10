jive.tile.onOpen(function(config, options) {
    jive.tile.getContainer(function(container) {

        // 0-11 mapped to month name
        var months = [
            "January"  , "February", "March"   , "April",
            "May"      , "June"    , "July"    , "August",
            "September", "October" , "November", "December"
        ];

        var places = [ "/places/" + container.placeID ];
        var ideaList = [];

        //if (config.place === "sub") {
        //    getSubplaces(container);
        //} else {
            getIdeas();
        //}

        function getSubplaces(container) {
            // get sub-places of this place
            if (container.type !== "blog") {
                pending++;
                var options = {
                    count: 100 // most likely not more than 100
                }
                container.getPlaces(options).execute(function(res) {
                    if (res.error) {
                        var code = res.error.code;
                        var message = res.error.message;
                        console.log(code + " " + message);
                        // present the user with an appropriate error message
                    } else {
                        for (place of res.list) {
                            places.push("/places/" + place.placeID);
                            getSubplaces(place);
                        }
                        pending--;
                        if (pending == 0) {
                            if (timer) {
                                console.log("getSubplaces " + (Date.now() - start) + " ms");
                            }
                            getIdeas();
                        }
                    }
                });
            }
        }

        function getIdeas(startIndex = 0) {
            var reqOptions = {
                count: 100,
                startIndex: startIndex,
                type: "idea"
            }
            // add place if not "all places"
            if (config.place === "sub" || config.place === "this") {
                reqOptions.place = places.join(",");
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
                            content: el.content.text
                        });
                    }

                    if (res.links && res.links.next) {
                        getIdeas(startIndex + 100);
                    } else {
                        showIdeas();
                    }
                }
            });
        }

        function showIdeas() {
            /*ideaList.sort(function(a, b) {
                return b.score - a.score;
            });*/

            var container = document.getElementById("idea-list");

            for (let i = 0; i < config.numResults; i++) {
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

                if (idea.stage === "Active") {
                    let updownvote = document.createElement("div");
                    updownvote.classList.add("vote");
                    scoreBlock.appendChild(updownvote);
                    let upvote = document.createElement("span");
                    upvote.classList.add("glyphicon", "glyphicon-menu-up", "upvote");
                    upvote.setAttribute("role", "button");
                    updownvote.appendChild(upvote);
                    let downvote = document.createElement("span");
                    downvote.classList.add("glyphicon", "glyphicon-menu-down", "downvote");
                    downvote.setAttribute("role", "button");
                    updownvote.appendChild(downvote);

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
                subjectLink.setAttribute("href", idea.url);
                subjectLink.textContent = idea.subject;
                header.appendChild(subjectLink);
                right.appendChild(header);

                let details = document.createElement("div");
                details.appendChild( document.createTextNode("Created on " + formatDate(idea.postDate) + " by ") );
                let authorLink = document.createElement("a");
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

            gadgets.window.adjustHeight();
        }

        /*
         * Delete tags and replace HTML codes
         */
        function fixFormatting(str) {
            str = str.replace(/<[^>]+>/g, "");
            str = str.replace(/&#160;/g, " ");
            str = str.replace(/&amp;/g, "&");
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

    });
});
