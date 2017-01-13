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
  if (rssServer === "") {
    $("#feed").replaceWith("URL for RSS server not provided");
  } else {
    $.get(rssServer + "/rss-server?rss=" + tileConfig.rssUrl, function(resp) {
      $("#feed").append(structureData(resp));
      app.resize();
    });
  }

  function structureData(d) {
    // d must be an array of items
    return d.map(item => {
      var title = "<h3><a href=\"" + item.link + "\">" + item.title + "</a></h3>";
      var author = "<p>By " + item["dc:creator"] + "</p>";
      var date = "<p>" + item.pubDate + "</p>";

      return title + author + date;
    }).join("");
  }
} // end function

//************************************************************************
//NOTE: CALLED AS SOON AS THE CONFIG IS RESOLVED
//************************************************************************
function onConfig(tileConfig,tileOptions) {
  console.log('onConfig',tileConfig,tileOptions);
} // end function

//************************************************************************
//NOTE: CALLED AS SOON AS THE CONTAINER IS RESOLVED
//************************************************************************
function onContainer(container) {
  console.log('onContainer',container);
} // end function

//************************************************************************
//NOTE: CALLED AS SOON AS THE VIEWER IS RESOLVED
//************************************************************************
function onViewer(viewer) {
  console.log('onViewer',viewer);
} // end function
