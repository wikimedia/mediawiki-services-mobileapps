'use strict';

var BBPromise = require('bluebird');
var preq = require('preq');
var domino = require('domino');
var extractLib = require('../lib/extract');
var mwapi = require('../lib/mwapi');
var mUtil = require('../lib/mobile-util');
var parse = require('../lib/parseProperty');
var parsoid = require('../lib/parsoid-access');
var sUtil = require('../lib/util');
var transforms = require('../lib/transforms');

/**
 * The main router object
 */
var router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
var app;

function drillDown(body) {
    var id = Object.keys(body.query.pages)[0];
    return body.query.pages[id];
}

function buildPreview(input) {
    var lead = domino.createDocument(input.page.sections[0].text);
    var obj = drillDown(input.extract.body);
    return {
        title: obj && obj.title,
        extract: obj && extractLib.format(obj.extract),
        thumbnail: mUtil.defaultVal(mUtil.filterEmpty({
            source: obj && obj.thumbnail && obj.thumbnail.source
        })),
        infobox: parse.parseInfobox(lead)
    };
}

/**
 * GET {domain}/v1/page/mobile-summary/{title}
 * Gets the preview for the given page title.
 */
router.get('/mobile-summary/:title', function (req, res) {
    return BBPromise.props({
        page: parsoid.pageContentPromise(app, req),
        extract: mwapi.requestExtract(app, req)
    }).then(function (response) {
        response = buildPreview(response);
        res.status(200);
        mUtil.setETag(req, res, response.revision);
        res.json(response).end();
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
