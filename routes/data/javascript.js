'use strict';

const sUtil = require('../../lib/util');
const js = require('../../lib/javascript');
const router = sUtil.router();

/**
 * Gets the JavaScript from the wikimedia-page-library
 */
router.get('/pagelib', (req, res) => js.fetchLegacyPageLibJs(res));
router.get('/pcs', (req, res) => js.fetchPageLibJs(res));

module.exports = function(appObj) {
    return {
        path: '/data/javascript/mobile',
        api_version: 1,
        router
    };
};
