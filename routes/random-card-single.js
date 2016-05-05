/**
* random-card-single returns information about single random article suited
* to card-type presentations.
*/

'use strict';

var BBPromise = require('bluebird');
var mwapi = require('../lib/mwapi');
var sUtil = require('../lib/util');

/**
* The main router object
*/
var router = sUtil.router();

/**
* The main application object reported when this module is require()d
*/
var app;

var maxExtractLength = 512;

/**
* relativeScoreForResult returns a numeric score which can be used to
* roughly determine the relative "quality" of random results.
*
* Scores are calculated as follows:
*
* 2 points for having:
*   thumb url
*
* 1 point for having:
*   wikidataDescription
*
* -10 point for being:
*   disambiguation page
*   list item page
*
* 0.0 to 1.0 point for extract length based on:
*  ratio of extract chars to max possible extract chars: (ie 256 chars / 512 max chars = 0.5)
*  this is used primarily as a tie-breaker as it can give a slight edge to results
*  having slightly longer extracts
*
*/
function relativeScoreForResult(result) {
  var hasThumbURL = result.thumbnail ? ("source" in result.thumbnail) : false;
  var hasWikidataDescription = result.terms ? ("description" in result.terms) : false;
  var isDisambiguationPage = result.pageprops ? ("disambiguation" in result.pageprops) : false;
  var hasExtract = ("extract" in result);
  var isListItemPage = false;

  if(hasWikidataDescription){
    if(!isDisambiguationPage){
      //HAX: the "disambiguation" flag is sometimes not set, so do backup wikidata description check. enwiki specific.
      if (result.terms.description[0].indexOf("disambiguation page") > -1) {
        isDisambiguationPage = true;
      }
    }
    //HAX: there is no "list item" flag, so do wikidata description check. enwiki specific.
    if(result.terms.description[0].indexOf("Wikimedia list article") > -1){
      isListItemPage = true;
    }
  }

  var score = 0.0;
  if(hasThumbURL){
    score += 2.0;
  }
  if(hasWikidataDescription){
    score += 1.0;
  }
  if(isDisambiguationPage || isListItemPage){
    score -= 10.0;
  }

  if(hasExtract){
    var extractLength = result.extract.length;
    if (extractLength > maxExtractLength){
      extractLength = maxExtractLength
    }
    score += extractLength / maxExtractLength;
  }
  return score;
}

function sortResultsByScore(results) {
  results.sort(function(a, b){
    return (b.score - a.score);
  });
}

function cleanResult(result){
  delete result["score"];
  var hasWikidataDescription = result.terms ? ("description" in result.terms) : false;
  if (hasWikidataDescription) {
    result["description"] = result.terms.description[0];
    delete result["terms"];
  }else{
    result["description"] = "";
  }
}

/**
* GET {domain}/v1/page/random/card/single
* Returns a single random result well suited to card-type layouts, i.e.
* one likely to have an image url, text extract and wikidata description.
*
* Multiple random items are requested, but only the result having
* the highest relative score is returned. Requesting about 12 items
* seems to consistently produce a really "good" result.
*/

router.get('/random/card/single', function (req, res) {

  var itemsToRequest = 12;
  return mwapi.apiGet(app, req, {
    "action": "query",
    "format": "json",
    "formatversion": 2,
    "exchars": maxExtractLength,
    "exintro": "1",
    "exlimit": itemsToRequest,
    "explaintext": "",
    "generator": "random",
    "grnfilterredir": "nonredirects",
    "grnlimit": itemsToRequest,
    "grnnamespace": "0",
    "pilimit": itemsToRequest,
    "piprop": "thumbnail",
    "pithumbsize": "640",
    "prop": "extracts|pageterms|pageimages",
    "wbptterms": "description"
  }).then(function (response) {
    mwapi.checkResponseStatus(response);
    res.status(200);

    var scoredResults = response.body.query.pages.map(function(result) {
      result.score = relativeScoreForResult(result);
      return result;
    });

    sortResultsByScore(scoredResults);

    console.log("\n\n");
    console.log("RESULTS - SCORED");
    console.log(scoredResults);
    console.log("\n\n");

    var bestResult = scoredResults[0];
    //var bestResult = scoredResults[scoredResults.length - 1]; // <-- use this for demo-ing "worst" result

    cleanResult(bestResult);

    res.json(bestResult).end();
  });
});

module.exports = function (appObj) {
  app = appObj;
  return {
    path: '/page',
    api_version: 1,
    router: router
  };
};

//module.exports._sortRandomResults = sortRandomResults;
