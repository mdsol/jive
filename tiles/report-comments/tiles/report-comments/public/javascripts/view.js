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

    console.log(page.name);
    console.log(container);
    var queryStr = "/search/contents?filter=type(discussion)";
    queryStr += "&filter=search(" + page.name + ")";
    console.log(container.placeID);
    console.log(queryStr);

    osapi.jive.core.get({
      v: "v3",
      href: queryStr
    }).execute(function(resp) {
      console.log(resp);
      var disc = resp.list.filter(function(x) {return x.subject === page.name})[0];
      var titleText = "Contents ("
                      + (disc === undefined ? 0 : disc.replyCount)
                      + ")";
      var anchor = $("<a>", { text: titleText,
                              href: disc === undefined ? "" : disc.resources.html.ref });

      $("#title-text").append(disc === undefined ? titleText : anchor);
      app.resize();

      $("#btn-submit").click(function() {
        var comment = $("#comment-box").val().trim();
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
              subject: page.name,
              content: {
                type: "text/html",
                text: "Feel free to discuss " + page.name + " below."
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
            anchor.text("Contents (" + disc.replyCount + ")");
            $("#title-text").empty().append(anchor);
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
