/**
 * Route for fetching Wiktionary definitions from Parsoid.
 */

'use strict';

var BBPromise = require('bluebird');
var domino = require('domino');
var mUtil = require('../lib/mobile-util');
var sUtil = require('../lib/util');
var parsoid = require('../lib/parsoid-access');

/**
 * The main router object
 */
var router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
var app;

/**
 * GET {domain}/v1/definition/{term}/{revision?}
 * Gets the Wiktionary definition for a given term (and optional revision ID).
 */
router.get('/definition/:term/:revision?', function (req, res) {
    return BBPromise.props({
        usages: parsoid.definitionPromise(req.logger, app.conf.restbase_uri, req.params.domain, req.params.term, req.params.revision)
    }).then(function (response) {
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
