'use strict';

const sUtil = require('../../lib/util');
const fetchBaseCss = require('../../lib/css').fetchBaseCss;

const router = sUtil.router();

/**
 * Gets the base CSS for the mobile apps
 */
router.get('/base', (req, res) => fetchBaseCss(res));

module.exports = function() {
    return {
        path: '/page/css',
        api_version: 1,
        router
    };
};
