(function() {
    jive.tile.onOpen(function(config, options) {
        gadgets.window.adjustHeight();

        // make sure config has default values
        if (config.data === undefined) {
            config.data = {
                title: "Recent Outdated Content",
                numDocs: 10,
                place: "sub",
                showLink: true,
                linkText: "See More Outdated Content",
                linkUrl: ""
            };
        };
        
        var title = document.getElementById("title");
        var numDocs = document.getElementById("num-docs");
        var radios = document.getElementsByName("place");
        var showLink = document.getElementById("show-link");
        var linkText = document.getElementById("link-text");
        var linkUrl = document.getElementById("link-url");

        // populate the dialog with existing config value
        title.value = config.data.title;
        numDocs.value = config.data.numDocs;
        for (let choice of radios) {
            if (choice.value === config.data.place) {
                choice.checked = true;
                break;
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

            numDocsVal = Number(data.numDocs.value);
            if (numDocsVal % 1 !== 0 || numDocsVal < 1 || numDocsVal > 100) {
                // test if not positive integer between 1 and 100
                showError(data.numDocs);
                valid = false;
            }

            if (data.showLink.checked && data.linkText.value === "") {
                showError(data.linkText);
                valid = false;
            }

            return valid;
        }
        
        function showError(errInput) {
            errInput.classList.add("error-box");
        }

        // update config object after clicking submit
        $("#btn-submit").click( function() {
            config.data.title = title.value;
            config.data.numDocs = numDocs.value;
            for (var choice of radios) {
                if (choice.checked) {
                    config.data.place = choice.value;
                    break;
                }
            }
            config.data.showLink = showLink.checked;
            config.data.linkText = linkText.value;
            config.data.linkUrl = linkUrl.value;
            var checkData = {
                numDocs: numDocs,
                showLink: showLink,
                linkText: linkText
            }
            if (validate(checkData)) {
                jive.tile.close(config, {} );
            } else {
                gadgets.window.adjustHeight();
            }
        });
    });

})();

$(document).ready(function() {
    $("#show-link").change(function() {
        $("#link-options").toggle();
        gadgets.window.adjustHeight();
    });
});
