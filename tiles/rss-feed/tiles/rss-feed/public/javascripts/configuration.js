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
  if (!tileConfig["data"]["title"]) {
      tileConfig["data"]["title"] = "RSS Feed";
  }
  if (!tileConfig["data"]["rssUrl"]) {
      tileConfig["data"]["rssUrl"] = "";
  }
  if (!tileConfig["data"]["numItems"]) {
      tileConfig["data"]["numItems"] = 6;
  }
  if (tileConfig["data"]["showImgs"] === undefined) {
      tileConfig["data"]["showImgs"] = true;
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
  $("#title").val(tileConfig["data"]["title"]);
  $("#rss-url").val(tileConfig["data"]["rssUrl"]);
  $("#num-items").val(tileConfig["data"]["numItems"]);
  $("#show-imgs").prop("checked", tileConfig.data.showImgs);
  $("#show-link").prop("checked", tileConfig.data.showLink);
  $("#link-text").val(tileConfig["data"]["linkText"]);
  $("#link-url").val(tileConfig["data"]["linkUrl"]);

  $("#link-options").toggle(tileConfig.data.showLink);
  $("#link-options input").attr("required", tileConfig.data.showLink);
  $("#show-link").change(function() {
    $("#link-options").toggle();
    $("#link-options input").attr("required", $("#show-link").is(":checked"));
    app.resize();
  });

  // update config object after clicking submit
  $("#options").submit(function(e) {
    var allValid = 
      $("#title").val() !== ""
      && !isNaN($("#num-items").val())
      && parseInt($("#num-items").val()) === parseFloat($("#num-items").val())
      && Number($("#num-items").val()) > 0
      && Number($("#num-items").val()) <= 100
      && /https?:\/\//.test($("#rss-url").val())
      && ( !$("#show-link").is(":checked")
           || $("#link-text").val() !== "" && $("#link-url").val() !== "" );

    console.log(allValid);
    if (allValid) {
      tileConfig["data"]["rssUrl"] = $("#rss-url").val();
      tileConfig["data"]["title"] = $("#title").val();
      tileConfig["data"]["numItems"] = Number($("#num-items").val());
      tileConfig["data"]["showImgs"] = $("#show-imgs").is(":checked");
      tileConfig["data"]["showLink"] = $("#show-link").is(":checked");
      tileConfig["data"]["linkText"] = $("#link-text").val();
      tileConfig["data"]["linkUrl"] = $("#link-url").val();
      jive.tile.close(tileConfig, {} );
    }
    e.preventDefault();
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
