/****************************************************
* This file should load AFTER view.js or container.js, or whichever .js file that defines the onReady, onContainer and onViewer
*
* Note:  This implmentation has been provided for convenience, developers are not required to use this pattern.
*
* SEE: Tile API & Development FAQ - https://community.jivesoftware.com/docs/DOC-185776
****************************************************/

//************************************************************************
//NOTE: CALLED AS SOON AS THE FULL CONTEXT IS RESOLVED
//************************************************************************
function onReady(tileConfig,tileOptions,viewer,container) {

  // make sure config has default value
  if (tileConfig === null) tileConfig = { };
  if (!tileConfig["data"]) {
      tileConfig["data"] = { };
  }
  if (!tileConfig["data"]["rssUrl"]) {
      tileConfig["data"]["rssUrl"] = "";
  }
  if (!tileConfig["data"]["title"]) {
      tileConfig["data"]["title"] = "RSS Feed";
  }

  // populate the dialog with existing config value
  $("#rss-url").val(tileConfig["data"]["rssUrl"]);
  $("#title").val(tileConfig["data"]["title"]);

  // update config object after clicking submit
  $("#btn-submit").click( function() {
      tileConfig["data"]["rssUrl"] = $("#rss-url").val();
      tileConfig["data"]["title"] = $("#title").val();
      jive.tile.close(tileConfig, {} );
  });

  app.resize();
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
