'use strict';

const sUtil = require('../../lib/util');
const js = require('../../lib/javascript');

const router = sUtil.router();

/**
 * Gets the JavaScript from the wikimedia-page-library
 */
router.get('/pagelib', (req, res) => js.fetchPageLibJs(res));
router.get('/pagelib_body_start', (req, res) => js.fetchPageLibBodyStartJs(res));
router.get('/pagelib_body_end', (req, res) => js.fetchPageLibBodyEndJs(res));

module.exports = function(appObj) {
    return {
        path: '/data/javascript/mobile',
        api_version: 1,
        router
    };
};
