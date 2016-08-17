(function() {
    jive.tile.onOpen(function(config, options) {
        gadgets.window.adjustHeight();

        // taken from the jquery-validation plugin and modified
        // https://github.com/jzaefferer/jquery-validation
        var urlRegex = /^(?:(?:(?:https?|ftp):)\/\/)?(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})).?)(?::\d{2,5})?(?:[/?#]\S*)?$/;
        var httpRegex = /^https?:\/\//;

        // URLs for filtering by content type
        var contentFilt = {
            this: {
                discussion: "&filterID=contentstatus%5Bpublished%5D~objecttype~objecttype%5Bthread%5D",
                document: "&filterID=contentstatus%5Bpublished%5D~objecttype~objecttype%5Bdocument%5D",
                idea: "&filterID=contentstatus%5Bpublished%5D~objecttype~objecttype%5Bidea%5D",
                poll: "&filterID=contentstatus%5Bpublished%5D~objecttype~objecttype%5Bpoll%5D",
                post: "&filterID=contentstatus%5Bpublished%5D~objecttype~objecttype%5Bblogpost%5D",
                event: "&filterID=contentstatus%5Bpublished%5D~objecttype~objecttype%5Bevent%5D~event%5Bupcoming%5D"
            },
            all: {
                discussion: "&filterID=all~objecttype~objecttype%5Bthread%5D",
                document: "&filterID=all~objecttype~objecttype%5Bdocument%5D",
                idea: "&filterID=all~objecttype~objecttype%5Bidea%5D",
                poll: "&filterID=all~objecttype~objecttype%5Bpoll%5D",
                post: "&filterID=all~objecttype~objecttype%5Bblogpost%5D",
                event: "&filterID=all~objecttype~objecttype%5Bevent%5D~event%5Bupcoming%5D"
            }
        };
        contentFilt.sub = contentFilt.this;

        jive.tile.getContainer(function (container) {
            var p = document.createElement("a");
            p.href = container.parent;

            // default url start
            var defaultUrlThis = container.resources.html.ref + "/content?sortKey=contentstatus%5Bpublished%5D~recentActivityDateDesc&sortOrder=0";
            var defaultUrlAll = p.origin + "/content?sortKey=all~recentActivityDateDesc&sortOrder=0";

            // make sure config has default values
            if (config.data === undefined) {
                config.data = {
                    title: "Recent Content",
                    numResults: 10,
                    place: "sub",
                    type: ["all"], // type is only ever ["all"] or an array of document types that doesn't include "all"
                    showLink: true,
                    linkText: "See More Recent Content",
                    linkUrl: container.resources.html.ref + defaultUrlThis
                };
            };

            var title = document.getElementById("title");
            var numResults = document.getElementById("num-results");
            var radios = document.getElementsByName("place");
            var types = document.getElementsByName("type");
            var showLink = document.getElementById("show-link");
            var linkText = document.getElementById("link-text");
            var linkUrl = document.getElementById("link-url");

            // populate the dialog with existing config value
            title.value = config.data.title;
            numResults.value = config.data.numResults;
            for (let choice of radios) {
                if (choice.value === config.data.place) {
                    choice.checked = true;
                    break;
                }
            }
            for (let choice of types) {
                if (config.data.type[0] === "all" || config.data.type.indexOf(choice.value) !== -1) {
                    choice.checked = true;
                    if (choice.value === "all") {
                        choice.disabled = true;
                    }
                }
            }
            showLink.checked = config.data.showLink;
            $("#link-options").toggle(showLink.checked);
            linkText.value = config.data.linkText;
            linkUrl.value = config.data.linkUrl;
            gadgets.window.adjustHeight();

            function validate(data) {
                var valid = true;
                var inputs = document.getElementsByClassName("error-box");
                for (var el of inputs) {
                    el.classList.remove("error-box");
                }

                numResultsVal = Number(data.numResults.value);
                if (numResultsVal % 1 !== 0 || numResultsVal < 1 || numResultsVal > 100) {
                    // test if not positive integer between 1 and 100
                    showError(data.numResults);
                    valid = false;
                }

                if (! $(types).is(":checked")) {
                    showError(document.getElementById("type-cols"));
                    valid = false;
                }

                if (data.showLink.checked && data.linkText.value === "") {
                    showError(data.linkText);
                    valid = false;
                }

                if (data.showLink.checked && data.linkUrl.value !== "" && !urlRegex.test(data.linkUrl.value)) {
                    showError(data.linkUrl);
                    valid = false;
                }

                return valid;
            }

            function showError(errInput) {
                errInput.classList.add("error-box");
            }

            $("#btn-submit").click( function() {
                var checkData = {
                    numResults: numResults,
                    showLink: showLink,
                    types: types,
                    linkText: linkText,
                    linkUrl: linkUrl
                }
                if (validate(checkData)) {
                    // get all of the new values
                    config.data.title = title.value;
                    config.data.numResults = Number(numResults.value);
                    for (var choice of radios) {
                        if (choice.checked) {
                            config.data.place = choice.value;
                            break;
                        }
                    }
                    if ($("input[name='type'][value='all']").is(":checked")) {
                        config.data.type = ["all"];
                    } else {
                        config.data.type = [];
                        for (var choice of types) {
                            if (choice.checked) {
                                config.data.type.push(choice.value);
                            }
                        }
                    }
                    config.data.showLink = showLink.checked;

                    if (showLink.checked) {
                        config.data.linkText = linkText.value;
                        if (linkUrl.value !== "" && !httpRegex.test(linkUrl.value)) {
                            linkUrl.value = "http://" + linkUrl.value;
                        } else if (linkUrl.value === "") {
                            linkUrl.value = (config.data.place === "all" ? defaultUrlAll : defaultUrlThis);
                            if (config.data.type.length === 1 && config.data.type[0] !== "all") {
                                linkUrl.value += contentFilt[config.data.place][config.data.type[0]];
                            }
                        }
                        config.data.linkUrl = linkUrl.value;
                    }

                    // submit
                    jive.tile.close(config, {} );
                } else {
                    gadgets.window.adjustHeight();
                }
            });
        });
    });
})();

$(document).ready(function() {
    $("#show-link").change(function() {
        $("#link-options").toggle();
        gadgets.window.adjustHeight();
    });

    var allType = $("input[name='type'][value='all']");
    var otherTypes = $("input[name='type']:not([value='all'])");
    $("input[name='type']").change(function() {
        if (this.value === "all" && this.checked) {
            // check all of the checkboxes if "all" checkbox is checked
            // disable the "all" checkbox
            otherTypes.prop("checked", true);
            this.disabled = true;
        } else if (this.value !== "all" && !this.checked){
            // uncheck the "all" checkbox if something else was unchecked
            // enable the "all" checkbox
            allType.prop("checked", false);
            allType.prop("disabled", false);
        } else if (otherTypes.filter(":checked").length === 6) {
            // check the "all" checkbox if all the rest are checked
            // disable the "all" checkbox
            allType.prop("checked", true);
            allType.prop("disabled", true);
        }
    });

    $("#featured").change(function() {
        if (this.checked) {
            $("input[name='place'][value='this']").prop("checked", true);
        }
    });
    $("input[name='place']").change(function() {
        if ($(this).filter(":checked").val() !== "this") {
            document.getElementById("featured").checked = false;
        }
    });
});
