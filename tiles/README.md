# tiles

## Requirements
- Node.js
- jive-sdk (install using `npm install -g jive-sdk`)

## Tile Quickstart
1. Clone repository and cd to tile directory

2. Install dependencies
 ```
 npm install
 ```

3. Create public folder in root
 ```
 mkdir public
 ```

4. Create extension package from source
 ```
 jive-sdk build add-on --apphosting="jive"
 ```
 
5. Upload and install the resulting "extension.zip"
   file to your Jive instance

## Google Analytics
Each tile comes with the following code near the bottom of view.html:

```
  <!-- Google Analytics -->
  <script>
    var tracking_id = 'INSERT_TRACKING_ID_HERE'
    var event_category = 'tile-load'
    var tile_name = 'TILE_NAME_HERE';

    jive.tile.getContainer(function(container) {
      var space_url = container.resources.html.ref;
      (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
        (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
      m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
      })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
      ga('create', tracking_id, 'auto');
      ga('send', 'event', event_category, tile_name, space_url);
    });
  </script>
  <!-- End Google Analytics -->
```

This code is used to track what pages users place the tile on. If you would like
to use this with your own Google Analytics account, create a property in Google
Analytics and replace "INSERT_TRACKING_ID_HERE" with the Tracking Id of the
property.
