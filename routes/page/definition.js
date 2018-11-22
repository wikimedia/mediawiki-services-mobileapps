/**
 * Route for fetching Wiktionary definitions from Parsoid.
 */

'use strict';

const mUtil = require('../../lib/mobile-util');
const sUtil = require('../../lib/util');
const getDefinitions = require('../../lib/definition');

/**
 * The main router object
 */
const router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
let app;

/**
 * GET {domain}/v1/definition/{title}{/revision}{/tid}
 * Gets the Wiktionary definition for a given term (and optional revision and tid).
 */
router.get('/definition/:title/:revision?/:tid?', (req, res) => {
    return getDefinitions(app, req)
    .then((response) => {
        res.status(200);
        mUtil.setETag(res, response.meta.revision);
        mUtil.setContentType(res, mUtil.CONTENT_TYPES.definition);
        mUtil.setLanguageHeaders(res, response._headers);
        // Don't poison the client response with the internal _headers object
        delete response._headers;

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
