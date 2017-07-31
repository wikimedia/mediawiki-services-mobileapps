'use strict';

const sUtil = require('../lib/util');
const mUtil = require('../lib/mobile-util');

/**
 * The main router object
 */
const router = sUtil.router();

// todo: populate after we've decided what offline compilations to serve. (T169905)
function getCompilations() { return []; }

/**
 * GET /compilations
 * Gets information about the available offline compilations
 */
router.get('/compilations', (req, res) => {
    const response = { compilations: getCompilations() };
    const hash = mUtil.hashCode(JSON.stringify(response));

    res.status(200);
    mUtil.setContentType(res, mUtil.CONTENT_TYPES.compilations);
    mUtil.setETag(res, hash);
    res.set('cache-control', 'public, max-age=7200, s-maxage=14400');
    res.json(response);
});

module.exports = function() {
    return {
        // todo: update when endpoint path is finalized
        path: '/',
        api_version: 1,
        router
    };
};
