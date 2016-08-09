jive.tile.onOpen(function(config, options) {
    jive.tile.getContainer(function(container) {

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
            ideaList.sort(function(a, b) {
                return b.score - a.score;
            });

            var container = document.getElementById("idea-list");

            for (let i = 0; i < config.numResults; i++) {
                let idea = ideaList[i];

                let outerDiv = document.createElement("div");
                container.appendChild(outerDiv);

                let left = outerDiv.cloneNode(false);
                let right = outerDiv.cloneNode(false);
                outerDiv.appendChild(left);
                outerDiv.appendChild(right);

                let leftText = document.createElement("p");
                leftText.textContent += "Score: " + idea.score;
                leftText.textContent += "\nStage: " + idea.stage;
                leftText.textContent += "\nVotes: " + idea.voteCount;
                left.appendChild(leftText);

                let header = document.createElement("h2");
                let subjectLink = document.createElement("a");
                subjectLink.setAttribute("href", idea.url);
                subjectLink.textContent = idea.subject;
                header.appendChild(subjectLink);
                right.appendChild(header);

                let details = document.createElement("div");
                details.appendChild( document.createTextNode("Created on " + idea.postDate + " by ") );
                let authorLink = document.createElement("a");
                authorLink.setAttribute("href", idea.authorUrl);
                authorLink.textContent = idea.author;
                details.appendChild(authorLink);
                details.appendChild( document.createTextNode(" - Last Modified: " + idea.lastAct) );
                right.appendChild(details);

                let content = document.createElement("div");
                let p = document.createElement("p");
                p.textContent = fixFormatting(idea.content);
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

    });
});
