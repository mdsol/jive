/****************************************************
* This file should load BEFORE main.js, since main.js calls the onReady, onContainer and onViewer methods
* Note:  This implmentation has been provided for convenience, developers are not required to use this pattern.
*
* SEE: Tile API & Development FAQ - https://community.jivesoftware.com/docs/DOC-185776
****************************************************/

//************************************************************************
//NOTE: CALLED AS SOON AS THE FULL CONTEXT IS RESOLVED
//************************************************************************
function onReady(tileConfig,tileOptions,viewer,container) {
  var entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;',
    "/": '&#x2F;'
  };

  function escapeHtml(string) {
    return String(string).replace(/[&<>"'\/]/g, function (s) {
      return entityMap[s];
    });
  }

  osapi.jive.core.get({
    v: "v3",
    href: "/places/" + container.placeID + "/pages"
  }).execute(function(resp) {
    var page = resp.list.filter(function(p) {
      for (var t of p.tiles) {
        if (t.id === tileOptions.tileInstanceId) {
          return true;
        }
      }
      return false;
    })[0];

    var discName = page.name + " [Comments]";

    osapi.jive.corev3.contents.get({
      place: "/places/" + container.placeID,
      type: "discussion",
      search: discName
    }).execute(function(resp) {
      var disc = resp.list.filter(function(x) {return x.subject === discName})[0];
      var titleText = "Comments ("
                      + (disc === undefined ? 0 : disc.replyCount)
                      + ")";
      var anchor = $("<a>", { text: titleText,
                              target: "_top",
                              href: disc === undefined ? "" : disc.resources.html.ref });

      $("#title-text").append(disc === undefined ? titleText : anchor);
      $("body").show();
      app.resize();

      $("#btn-submit").click(function() {
        var comment = escapeHtml($("#comment-box").val().trim());
        if (comment === "") {
          return;
        }

        if (disc === undefined) {
          // create new discussion about page
          osapi.jive.core.post({
            v: "v3",
            href: "/contents",
            body: {
              type: "discussion",
              subject: discName,
              content: {
                type: "text/html",
                text: "Feel free to discuss <a href=\"" + page.resources.html.ref + "\">" + page.name + "</a> below."
              },
              parent: "/places/" + container.placeID
            }
          }).execute(function(resp) {
            disc = resp;
            anchor.attr("href", disc.resources.html.ref);

            createComment();
          });
        } else {
          createComment();
        }

        function createComment() {
          $("#comment-box, #btn-submit").prop("disabled", true).css("opacity", 0.5);

          osapi.jive.core.post({
            v: "v3",
            href: "/messages/contents/" + disc.contentID,
            body: {
              content: {
                type: "text/html",
                text: "<body>"
                      + comment.split("\n")
                               .map(function(x) {return "<p>" + x + "</p>"})
                               .join("")
                      + "</body>"
              },
              type: "message"
            }
          }).execute(function(resp) {
            disc.replyCount++;
            anchor.text("Comments (" + disc.replyCount + ")");
            $("#title-text").empty().append(anchor);

            $("#comment-box").val("");
            $("#comment-box, #btn-submit").prop("disabled", false).css("opacity", 1);

            $("#posted-text").show();
            setTimeout(function() {
              $("#posted-text").fadeOut("slow");
            }, 2000);
          });
        }
      })
    });
  });

} // end function

//************************************************************************
//NOTE: CALLED AS SOON AS THE CONFIG IS RESOLVED
//************************************************************************
function onConfig(tileConfig,tileOptions) {
  //console.log('onConfig',tileConfig,tileOptions);
} // end function

//************************************************************************
//NOTE: CALLED AS SOON AS THE CONTAINER IS RESOLVED
//************************************************************************
function onContainer(container) {
  //console.log('onContainer',container);
} // end function

//************************************************************************
//NOTE: CALLED AS SOON AS THE VIEWER IS RESOLVED
//************************************************************************
function onViewer(viewer) {
  //console.log('onViewer',viewer);
} // end function
