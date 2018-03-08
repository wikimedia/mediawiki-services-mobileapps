'use strict';

const sUtil = require('../../lib/util');
const lib = require('../../lib/css');
const fetchBaseCss = lib.fetchBaseCss;
const fetchPageViewCss = lib.fetchPageViewCss;
const fetchPreviewCss = lib.fetchPreviewCss;

const router = sUtil.router();

/**
 * Gets the base CSS for the mobile apps
 */
router.get('/base', (req, res) => fetchBaseCss(res));

/**
 * Gets additional CSS for page views (not previews)
 */
router.get('/pageview', (req, res) => fetchPageViewCss(res));

/**
 * Gets additional CSS for page previews
 */
router.get('/preview', (req, res) => fetchPreviewCss(res));

module.exports = function() {
    return {
        path: '/page/css',
        api_version: 1,
        router
    };
};
