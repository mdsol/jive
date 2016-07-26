$(document).ready(function() {

    //Firefox still doesn't support wav files.
    var audio_level_up_url = "/static/sounds/level_up_2.wav";
    var audio_fail_url = "/static/sounds/no.wav";
    var audio_success_url = "/static/sounds/yes.wav";
    var the_end_url = "/static/sounds/the_end.wav";
    var audio_ping_url = "/static/sounds/ping.wav";

    try {
        var audio_level_up = new Audio(audio_level_up_url);
        var audio_fail = new Audio(audio_fail_url);
        var audio_success = new Audio(audio_success_url);
    }
    catch (e) {
        console.log(e.message);
    }

    filter = {department: "All", location: "All"};


    function send_answer(player_guess_id) {
        $('#loading').show();
        $("button").prop("disabled",true);
        $("#toxic").prop("disabled",true);
        $("select").prop("disabled",true);

        $.ajax({
            type: "POST",
            url: '/play',
            async: true,
            data: JSON.stringify({'id' : turn_id, 'player_guess_id': player_guess_id, 'filter': filter}),
            dataType: "json",
            contentType: "application/json; charset=utf-8",
            error: function (error) {
                alert('There was some problem with the server. Sorry. Try refreshing the page and trying again.');
            },
            success: function(data) {
                $('#loading').hide();
                if (data.hasOwnProperty('error')) {
                    do_alert.error(data.error);
                }

                if (data.hasOwnProperty('result')) {

                    if (data.result == "refresh") {
                        location.reload(true);
                    }

                    //update the ID for the next attempt
                    turn_id = data.id;

                    // toxic
                    if (data.state === 'T') {
                        $(".float-msg").text(data.result);
                        $(".float-msg").show();
                        setTimeout(function() {
                            $(".float-msg").fadeOut("slow");
                        }, 5000);
                    } else {
                        //Show the result (and play success or failure sound)
                        $('#game_result').html(data.result);
                        $('#game_result').show();
                    }

                    if (data.state === 'W') {
                        //Play sound. Have good time, up the progress bar
                        if (data.add_points == 1) {
                            $('#points').html('+1 Point');
                        } else {
                            $('#points').html('+' + data.add_points + ' Points');
                        }
                        $('#points').show();

                        //Update progress bar, levels and level name
                        $('#level_val').html(data.player_level[0]);
                        $('#level_name').html(data.player_level[1]);
                        $('#innerbar').css('width', data.player_level[2]+'%');
                        $('#game_result').removeClass('incorrect').addClass('correct');

                        try {
                            if (window.chrome) {
                                audio_success = new Audio(audio_success_url);
                            }
                            audio_success.play();
                        } catch (e) {
                            console.log(e.message);
                        }

                        //If level up, some excitement about that
                        if (data.level_up) {
                            $('#levbox').effect("highlight", { color: "#00ff00" }, 2000);
                            try {
                                if (window.chrome) {
                                    audio_level_up = new Audio(audio_level_up_url);
                                }
                                audio_level_up.play();
                            } catch (e) {
                                console.log(e.message);
                            }
                        }

                    } else if (data.state === 'L') {
                        $('#points').hide();
                        $('#game_result').removeClass('correct').addClass('incorrect');

                        if (data.state == 'L') {
                            //Play sad sound.
                            try {
                                if (window.chrome) {
                                    audio_fail = new Audio(audio_fail_url);
                                }
                                audio_fail.play();
                            } catch (e) {
                                console.log(e.message);
                            }
                        }

                    }

                    //Function to fade out the old and bring in the new
                    var change_turn = function(){
                        if (!data.no_players_left) {
                            $('#game_result').html('New Game');
                        }
                        $('#points').hide();
                        $('#player_img').fadeOut('slow',function() {
                            //What if there are no players left.
                            if (data.no_players_left) {
                                no_players_left();
                                return;
                            }

                            $('#player_img').attr("src", "data:image/jpeg;base64,"+data.image_url+"");
                            $('#player_img').fadeIn('slow');

                            var children = $("#player_table").children();
                            for (var i = 0; i < data.players.length; i++) {
                                $(children[i]).find("#name").text(data.players[i].name);
                                $(children[i]).find("#title").text(data.players[i].title);
                                $(children[i]).find("button").val(data.players[i].id);
                            }

                            //slide down guesses for next try
                            $('#guesses').slideDown();

                            //At same time
                            $('#game_result').fadeOut('fast');

                            $("button").prop("disabled",false);
                            $("#toxic").prop("disabled",false);
                            $("select").prop("disabled",false);

                        }); //end fadeout
                    }; //end change_turn function

                    // activate popover
                    $("#p_shown_link").popover({
                        placement: "bottom",
                        html: true,
                        trigger: "focus"
                    });

                    // pause transition to next turn when mouse is over link
                    var timeoutID = setTimeout(change_turn, 1500);
                    $("#p_shown_link").hover(
                            function() { clearTimeout(timeoutID); },
                            function() {
                                if ($(".popover").length === 0) { timeoutID = setTimeout(change_turn, 1500) };
                            }
                            );

                    // continue transition when person closes popover
                    $("#p_shown_link").focusout( function() {
                        timeoutID = setTimeout(change_turn, 1500);
                    });

                } //endif result
            } //end success
        }); //end ajax
    } //end function

    function new_filter() {
        $("#loading").show();
        $("button").prop("disabled",true);
        $("#toxic").prop("disabled",true);
        $("select").prop("disabled",true);

        $.ajax({
            type: "POST",
            url: '/play',
            async: true,
            data: JSON.stringify({ 'id' : turn_id, 'filterchange' : true, 'filter': filter }),
            dataType: "json",
            contentType: "application/json; charset=utf-8",
            error: function (error) {
                alert('There was some problem with the server. Sorry. Try refreshing the page and trying again.');
            },
            success: function(data){
                $('#loading').hide();
                if (data.hasOwnProperty('error')) {
                    do_alert.error(data.error);
                }

                //What if there are no players left.
                if (data.hasOwnProperty('no_players_left')) {
                    no_players_left();
                    return;
                } else if ($("#reset-filters").is(":visible")){
                    $("#reset-filters").hide();
                }

                if (data.hasOwnProperty('result')) {

                    //Fade out the old and bring in the new
                    setTimeout(function(){
                        $('#game_result').html('New Game');
                        $('#points').hide();
                        $('#player_img').fadeOut('slow',function() {
                            if (!turn_id) {
                                $('#gamecenter').find('h2').show();
                                $("#toxic").parent().show();
                                $('#game_result').html("");
                                $('#game_result').removeClass('correct');
                            }

                            //update the ID for the next attempt
                            turn_id = data.id;

                            $('#player_img').attr("src", "data:image/jpeg;base64,"+data.image_url+"");
                            $('#player_img').fadeIn('slow');

                            var children = $("#player_table").children();
                            for (var i = 0; i < data.players.length; i++) {
                                $(children[i]).find("#name").text(data.players[i].name);
                                $(children[i]).find("#title").text(data.players[i].title);
                                $(children[i]).find("button").val(data.players[i].id);
                            }

                            //slide down guesses for next try
                            $('#guesses').slideDown();

                            //At same time
                            $('#game_result').fadeOut('fast');

                            $("button").prop("disabled",false);
                            $("#toxic").prop("disabled",false);
                            $("select").prop("disabled",false);

                        }); //end fadeout



                    }, 1000); //end timeout


                } //endif result
            } //endif
        }); //end ajax

    }


    function no_players_left() {
        $('#guesses').slideUp();
        $('#gamecenter').find('h2').hide();
        $('#player_img').hide();
        $("#toxic").parent().hide();
        $('#game_result').removeClass('incorrect').addClass('correct');

        var dep = $("#department option:selected").text();
        var loc = $("#location option:selected").text();
        if (dep == "All" && loc == "All") {
            var no_players_left_msg = "You have collected all the Medidatians in the game! Until some more people sign up, you can't collect more Medidatians. Thanks for playing!";
            $("#filter").hide();
        } else {
            var no_players_left_msg = "You have collected all the Medidatians in ";
            if (dep == "All" || loc == "All") {
                no_players_left_msg += (dep == "All" ? loc : dep) + ". ";
            } else {
                no_players_left_msg += loc + " and " + dep + ". "
            }
            no_players_left_msg += 'Select a new filter or click the "Reset Filters" button below.';
            $("#reset-filters").show()
        }

        $('#game_result').html(no_players_left_msg);
        $('#game_result').show();
        turn_id = null;
        $("button").prop("disabled",false);
        $("select").prop("disabled",false);
        new Audio(the_end_url).play();
    }

    $("#player_table").find("button").click(function() {
        send_answer(this.value);
    });

    $("#toxic").click(function() {
        if (!$(this).attr('disabled')) {
            if (confirm('Are you sure you want to report this player for a bad image?')) {
                send_answer("toxic");
            }
        }
    });

    $("#filter").find("#department").change(function() {
        filter.department = $(this).val();
        new_filter();
    });
    $("#filter").find("#location").change(function() {
        filter.location = $(this).val();
        new_filter();
    });

    $("#reset-filters").click(function() {
        $("#department").val("All");
        $("#location").val("All");
        filter.department = filter.location = "All";
        $(this).hide();
        new_filter();
    });

    /*-----------------------------------------------------
      PUBNUB
      */
    function addMessage(m) {
        var messageEl= $("<p><span class='msg_from'>" + m.from + ": </span>" + m.text + "</p>");
        $('#useractions').append(messageEl);

        //Make sure we can see the message, scroll into view.
        $('#useractions').animate({ scrollTop: messageEl.offset().top}, 'slow');

        //Play a little sound
        try {
            if (window.chrome) {
                audio_ping = new Audio(audio_ping_url);
            }
            audio_ping.play();
        } catch (e) {
            console.log(e.message);
        }
    }

    (function(){


        // INIT PubNub
        var pubnub = PUBNUB.init({
            subscribe_key : pubnub_subscribe_key,
            publish_key   : pubnub_publish_key,
            ssl           : true
        });


        var chatbox = $('#chatbox'),
        sendMessageButton = $('#sendmsg'),
        useractions = $('#messageList');

        // LISTEN
        pubnub.subscribe({
            restore: true,
            channel : "medifaces",
            callback : function(m){

                addMessage(m);
                console.log('Pubnub ' + m.text);

            },
            connect : function(channel) {
                // SEND
                console.log("Connected");
            }
        });


        sendMessageButton.click(function (event) {
            var message = chatbox.val();

            if (message != '') {
                pubnub.publish({
                    channel: 'medifaces',
                    message: { from: this_player_fullname, text: message }
                });

                //Clear the chatbox
                chatbox.val('');
            }
        });

        chatbox.bind('keydown', function (event) {
            if((event.keyCode || event.charCode) !== 13) return true;
            sendMessageButton.click();
            return false;
        });

    })();
});
