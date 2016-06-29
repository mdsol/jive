(function() {
    jive.tile.onOpen(function(config, options) {
        gadgets.window.adjustHeight();

        // make sure config has default values
        if (config.data === undefined) {
            config.data = {
                title: "Recent Outdated Content",
                numDocs: 10,
                numDocsDefault: 10,
                place: "sub"
            };
        };
        
        var title = document.getElementById("title");
        var numDocs = document.getElementById("num-docs");
        var radios = document.getElementsByName("place");

        // populate the dialog with existing config value
        title.value = config.data.title;
        numDocs.value = config.data.numDocs;
        for (let choice of radios) {
            if (choice.value === config.data.place) {
                choice.checked = true;
                break;
            }
        }


        function validate(data) {
            var valid = true;
            var inputDivs = document.getElementsByClassName("jive-error-box");
            for (div of inputDivs) {
                div.className = "";
            }

            numDocsVal = Number(data.numDocs.value);
            if (numDocsVal % 1 !== 0 || numDocsVal < 1 || numDocsVal > 100) {
                // test if not positive integer between 1 and 100
                showError(data.numDocs);
                valid = false;
            }
            return valid;
        }
        
        function showError(errInput) {
            errInput.className += " error-box";
        }

        // update config object after clicking submit
        $("#btn-submit").click( function() {
            config.data.title = title.value;

            for (var choice of radios) {
                if (choice.checked) {
                    config.data.place = choice.value;
                    break;
                }
            }
            if (validate({title: title, numDocs: numDocs})) {
                config.data.numDocs = numDocs.value;
                jive.tile.close(config, {} );
            } else {
                gadgets.window.adjustHeight();
            }
        });
    });

})();
