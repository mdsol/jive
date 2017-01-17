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
  if (!tileConfig["data"]["numItems"]) {
      tileConfig["data"]["numItems"] = 6;
  }
  if (tileConfig["data"]["showLink"] === undefined) {
      tileConfig["data"]["showLink"] = true;
  }
  if (!tileConfig["data"]["linkText"]) {
      tileConfig["data"]["linkText"] = "";
  }
  if (!tileConfig["data"]["linkUrl"]) {
      tileConfig["data"]["linkUrl"] = "";
  }

  // populate the dialog with existing config value
  $("#rss-url").val(tileConfig["data"]["rssUrl"]);
  $("#title").val(tileConfig["data"]["title"]);
  $("#num-items").val(tileConfig["data"]["numItems"]);
  $("#link-text").val(tileConfig["data"]["linkText"]);
  $("#link-url").val(tileConfig["data"]["linkUrl"]);

  var showLink = document.getElementById("show-link");
  showLink.checked = tileConfig.data.showLink;
  if (!showLink.checked) {
    $("#link-options").hide();
  }
  showLink.onchange = function() {
    $("#link-options").toggle();
    app.resize();
  }

  // update config object after clicking submit
  $("#btn-submit").click( function() {
      tileConfig["data"]["rssUrl"] = $("#rss-url").val();
      tileConfig["data"]["title"] = $("#title").val();
      tileConfig["data"]["numItems"] = $("#num-items").val();
      tileConfig["data"]["showLink"] = showLink.checked;
      tileConfig["data"]["linkText"] = $("#link-text").val();
      tileConfig["data"]["linkUrl"] = $("#link-url").val();
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
