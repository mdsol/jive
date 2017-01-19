(function() {
    var sortOrder ="0";
    var sortkey = "recentActivityDateDesc";
    var myplace="";
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
        contentFilt.choose = contentFilt.sub = contentFilt.this;

        jive.tile.getContainer(function (container) {
            var p = document.createElement("a");
            p.href = container.parent;
            console.log('p.origin',p.origin);
            console.log('container.parent',container.parent);

            // default url start
            var defaultUrlThis = container.resources.html.ref + "/content?sortKey=contentstatus%5Bpublished%5D~recentActivityDateDesc&sortOrder=0";
            var defaultUrlAll = p.origin + "/content?sortKey=all~recentActivityDateDesc&sortOrder=0";

            // make sure config has default values
            //console.log('config.data: ',config.data);

            if (config.data === undefined) {
                config.data = {
                    title: "Recent Content",
                    numResults: 10,
                    place: "sub",
                    placeUrl: "",
                    type: ["all"], // type is only ever ["all"] or an array of document types that doesn't include "all"
                    showLink: true,
                    linkText: "See More Recent Content",
                    linkUrl: defaultUrlThis,
                    featured: false,
                    sortorder: sortOrder,
                    sortkey: sortkey
                };
            };

            console.log('config.data.linkUrl: ',config.data.linkUrl);
            console.log('config.data: ',config.data);
            console.log('config.data.place: ',config.data.place);
            console.log('sortOrder: ',config.data.sortorder,' sortKey: ',config.data.sortkey);

            var title = document.getElementById("title");
            var numResults = document.getElementById("num-results");
            var radios = $("#selectplace");
            var sorting = $("#selectfilter");
            var types = document.getElementsByName("type");
            var showLink = document.getElementById("show-link");
            var linkText = document.getElementById("link-text");
            var linkUrl = document.getElementById("link-url");
            var featured = document.getElementById("featured");
            var placeUrl = document.getElementById("place-url");


            // populate the dialog with existing config value
            title.value = config.data.title;
            numResults.value = config.data.numResults;

            $("#selectplace > option[value='" + config.data.place + "']")
                .prop("selected", true);
            if (config.data.place === "choose") {
                $("#place-url, #div-place-url").show();
            } else {
                $("#place-url, #div-place-url").hide();
            }

            // /*on place detaile  changes change the URL*/
            // $("#selectplace").change(function(){

            //     myplace = $(this).val();
            //     if($(this).val() == "all") {
            //         //linkUrl.value = defaultUrlAll;
            //         //config.data.linkUrl = defaultUrlAll;
            //         config.data.place = myplace;
            //     }else if($(this).val() == "choose"){
            //         //config.data.linkUrl = linkUrl.value;
            //     }else{

            //         //linkUrl.value = defaultUrlThis;
            //         //config.data.linkUrl = defaultUrlThis;
            //         config.data.place = myplace;
            //     }
            // });

            /* Show filter selected with configuration value */
            $("#selectfilter > option[value='" + config.data.sortkey + "']")
                .prop("selected", true);

            // Set place URL
            $("#place-url").val(config.data.placeUrl);

            // Select checkboxes corresponding to config.data.type
            $("[name='type']").filter(function(i, elt) {
                return config.data.type[0] === "all"
                       || $.inArray(elt.value, config.data.type) !== -1;
            }).prop("checked", true);
            $("input[name='type'][value='all']")
                .prop("disabled", config.data.type[0] === "all");

            showLink.checked = config.data.showLink;
            $("#link-options").toggle(showLink.checked);
            linkText.value = config.data.linkText;
            linkUrl.value = config.data.linkUrl;
            featured.checked = config.data.featured;


            // Adding Dynamic Filter from Config page

            $('#selectfilter').change(function () {

                sortOrder = $('option:selected', this).attr('datasortorder');
                sortkey = $(this).val();
                defaultUrlThis = container.resources.html.ref + "/content?sortKey=contentstatus%5Bpublished%5D~"+sortkey+"&sortOrder="+sortOrder;
                defaultUrlAll = p.origin + "/content?sortKey=all~"+sortkey+"&sortOrder="+sortOrder;

                //config.data.linkUrl = defaultUrlThis;
                //linkUrl.value = config.data.linkUrl;
                config.data.sortkey = sortkey;
                config.data.sortorder = sortOrder;


                linkUrl.value = (config.data.place == "all" ? defaultUrlAll : defaultUrlThis);

                /* if(myplace == "all"){
                //linkUrl.value =   defaultUrlAll;
                }else if(myplace == "choose"){
                    config.data.linkUrl = linkUrl.value;
                }else{linkUrl.value =   defaultUrlThis;}*/

            });

            gadgets.window.adjustHeight();

            function validate(data) {
                var valid = true;
                $(".error-box").removeClass("error-box");

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

            $("#btn-submit").click( function(e) {
                e.preventDefault();
                var checkData = {
                    numResults: numResults,
                    showLink: showLink,
                    types: types,
                    linkText: linkText,
                    linkUrl: linkUrl
                };

                //if(myplace == "choose"){
                //alert(linkUrl.value);
                config.data.linkUrl = linkUrl.value;
                //}

                if (validate(checkData)) {
                    // get all of the new values
                    config.data.title = title.value;
                    config.data.numResults = Number(numResults.value);
                    config.data.place = radios.val();
                    config.data.sortkey = sorting.val();
                    config.data.sortorder = sortOrder;
                    config.data.linkUrl = linkUrl.value;
                    /*for (var choice of radios) {
                        if (choice.checked) {
                            config.data.place = choice.value;
                            break;
                        }
                    }*/
                    if ($("input[name='type'][value='all']").is(":checked")) {
                        config.data.type = ["all"];
                    } else {
                        config.data.type = [];
                        for (var choice in types) {
                            choice = types[choice];
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
                            /*if (config.data.type.length === 1 && config.data.type[0] !== "all") {
                                linkUrl.value += contentFilt[config.data.place][config.data.type[0]];
                            }*/
                        }
                        config.data.linkUrl = linkUrl.value;
                        //if(myplace == "choose"){
                        //alert(linkUrl.value);
                        config.data.linkUrl = linkUrl.value;
                        //}
                    }

                    config.data.featured = featured.checked;

                    jive.tile.close(config, {} );
                } else {
                    gadgets.window.adjustHeight();
                }
            });

            $("#place-chooser").click(function(e) {
                e.preventDefault();
                osapi.jive.corev3.search.requestPicker({
                    excludePeople: true,
                    excludeContent: true,
                    excludePlaces: false,
                    success: function(place) {
                        console.log(place);
                        config.data.placeID = place.placeID;
                        $("#chosen-place").append(
                            $("<div>", {
                                "class": "jive-icon-med jive-icon-" + place.type
                            }).text(place.name)
                        );
                    }
                });
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
        } else if (otherTypes.filter(":checked").length === otherTypes.length) {
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


    // added by vivek

    $('#selectplace').change(function () {
        if($("#selectplace").val() == 'choose'){
            $("#place-url").show();
            $("#div-place-url").show();
        }else{
            $("#place-url").hide();
            $("#div-place-url").hide();
        }
        gadgets.window.adjustHeight();
    });
});
