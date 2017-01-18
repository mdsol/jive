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
      if (resp.error !== undefined) {
        $("#feed").replaceWith("Invalid RSS feed URL provided.");
        app.resize();
      } else {
        $("#feed").append(structureData(resp));

        if (tileConfig.showLink) {
          var correctLinkUrl = (/^https?:\/\//.test(tileConfig.linkUrl) ? "" : "//")
            + tileConfig.linkUrl;
          $("#link").attr("href", correctLinkUrl);
          $("#link").text(tileConfig.linkText);
        } else {
          $("footer").remove();
        }
        app.resize();

        window.onresize = app.resize;
      }
    }).fail(function() {
      $("#feed").replaceWith("Problem connecting to the RSS feed. Please try again later.");
      app.resize();
    });
  }

  function structureData(d) {
    // d must be an array of items
    return d.sort(function(a, b) {
      return new Date(b.pubDate) - new Date(a.pubDate);
    }).slice(0, tileConfig.numItems)
      .map(function(item) {
        var title = "<div id='title'><a target='_top' href='" + item.link + "'>"
                    + item.title
                    + "</a></div>";

        var author = "<span id='author'>By " + item["dc:creator"] + "</span>";
        var date = "<span id='date' title='"
                   + moment(item.pubDate).format("DD-MMM-YYYY")
                   + "'>"
                   + moment(item.pubDate).fromNow()
                   + "</span>";
        var metadata = "<div id='metadata'>" + author + " - " + date + "</div>";
        var descr = "<p id='description'>"
                    + $("<p>" + item.description + "<\p>").text()
                    + "</p>";

        var content = "<div id='content'>" + title + metadata + descr + "</div>";
        var img = !tileConfig.showImgs
                  ? ""
                  : item["media:content"] !== undefined
                  ? "<img src='" + item["media:content"]["$"]["url"] + "'/>"
                  : item["media:thumbnail"] !== undefined
                  ? "<img src='" + item["media:thumbnail"]["$"]["url"] + "'/>"
                  : "";

        return "<div id='item'>" + img + content + "</div>";
    }).join("<hr>");
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
