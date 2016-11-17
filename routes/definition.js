/**
 * Route for fetching Wiktionary definitions from Parsoid.
 */

'use strict';

const mUtil = require('../lib/mobile-util');
const sUtil = require('../lib/util');
const parsoid = require('../lib/parsoid-access');

/**
 * The main router object
 */
const router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
let app;

/**
 * GET {domain}/v1/definition/{title}/{revision?}
 * Gets the Wiktionary definition for a given term (and optional revision ID).
 */
router.get('/definition/:title/:revision?', (req, res) => {
    return parsoid.definitionPromise(app, req)
    .then((response) => {
        res.status(200);
        mUtil.setETag(res, response.meta.revision);
        mUtil.setContentType(res, mUtil.CONTENT_TYPES.definition);
        res.json(response.payload).end();
    });
});

module.exports = function(appObj) {
    app = appObj;
    return {
        path: '/page',
        api_version: 1,
        router
    };
};
