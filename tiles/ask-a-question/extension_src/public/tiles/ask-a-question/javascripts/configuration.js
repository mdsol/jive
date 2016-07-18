(function() {
    jive.tile.onOpen(function(config, options) {
        gadgets.window.adjustHeight();

        // taken from the jquery-validation plugin and modified
        // https://github.com/jzaefferer/jquery-validation
        var urlRegex = /^(?:(?:(?:https?|ftp):)\/\/)?(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})).?)(?::\d{2,5})?(?:[/?#]\S*)?$/;
        var httpRegex = /^https?:\/\//;

        // make sure config has default values
        if (config.data === undefined) {
            config.data = {
                title: "Ask a Question",
                numResults: 10,
                qType: "all",
                place: "all"
            };
        };
        
        var title = document.getElementById("title");
        var numResults = document.getElementById("num-results");
        var qType = document.getElementsByName("q-type");
        var place = document.getElementsByName("place");

        // populate the dialog with existing config value
        title.value = config.data.title;
        numResults.value = config.data.numResults;
        for (let choice of qType) {
            if (choice.value === config.data.qType) {
                choice.checked = true;
                break;
            }
        }
        for (let choice of place) {
            if (choice.value === config.data.place) {
                choice.checked = true;
                break;
            }
        }
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

            return valid;
        }
        
        function showError(errInput) {
            errInput.classList.add("error-box");
        }

        $("#btn-submit").click( function() {
            var checkData = {
                numResults: numResults,
            }
            if (validate(checkData)) {
                // get all of the new values
                config.data.title = title.value;
                config.data.numResults = Number(numResults.value);
                for (var choice of qType) {
                    if (choice.checked) {
                        config.data.qType = choice.value;
                        break;
                    }
                }
                for (var choice of place) {
                    if (choice.checked) {
                        config.data.place = choice.value;
                        break;
                    }
                }
                
                // submit
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
