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
      var discList = resp.list.filter(function(x) {return x.subject === page.name});
      var titleText = "Contents ("
                      + (discList.length === 0 ? 0 : discList[0].replyCount)
                      + ")";
      var anchor = $("<a>", { text: titleText,
                              href: discList[0].resources.html.ref });

      $("#title-text").append(discList.length === 0 ? titleText : anchor);
      app.resize();
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
