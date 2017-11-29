'use strict';

const sUtil = require('../lib/util');
const mUtil = require('../lib/mobile-util');
const announcements = require('../lib/feed/announcements');

/**
 * The main router object
 */
const router = sUtil.router();

/**
 * GET /announcements
 * Gets the announcements available for clients
 */
router.get('/announcements', (req, res) => {
    const json = announcements.getAnnouncements(req.params.domain);
    const hash = mUtil.hashCode(JSON.stringify(json));

    res.status(200);
    mUtil.setContentType(res, mUtil.CONTENT_TYPES.announcements);
    mUtil.setETag(res, hash);
    res.set('cache-control', 'public, max-age=7200, s-maxage=14400');
    res.json(json);
});

module.exports = function() {
    return {
        path: '/feed',
        api_version: 1,
        router
    };
};
