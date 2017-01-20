var express = require("express");
var app = express();
var url = require('url');
var rp = require('request-promise-native');
var parseString = require('xml2js').parseString;

var port = 3000;

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.get('/rss-server', function(req, res) {
  if (req.query.rss === undefined) {
    res.json({
      error: {
        status: 400,
        message: "No RSS feed provided"
      }
    });
  } else {
    rp({
      uri: req.query.rss,
      family: 4
    }).then(result =>
      parseString(result, function(err, result) {
        if (err) {
          reject(err);
        } else {
          var resultList = result.rss.channel[0].item;
          for (var elt of resultList) {
            for (var prop of Object.keys(elt)) {
              elt[prop] = elt[prop][0];
            }
          }
          res.json(resultList);
        }
      })
    ).catch(err => {
      console.log(err);
      res.json({
        error: {
          status: err.statusCode || 500,
          message: err.message
        }
      });
    });
  }
});

app.listen(port, function() {
  console.log(`running on port ${port}...`);
});
