'use strict';

const sUtil = require('../../lib/util');
const js = require('../../lib/javascript');
const router = sUtil.router();

/**
 * Gets the JavaScript from the wikimedia-page-library
 */
router.get('/pagelib', (req, res) => js.fetchLegacyPageLibJs(res));
router.get('/pcs', (req, res) => js.fetchPageLibJs(res));
router.get('/components', (req, res) => js.fetchComponentLibJs(res));
router.get('/webcomponents', (req, res) => js.fetchWebComponentLibJs(res));
router.get('/vendor', (req, res) => js.fetchVendorLibJs(res));

module.exports = function(appObj) {
    return {
        path: '/data/javascript/mobile',
        api_version: 1,
        router
    };
};
