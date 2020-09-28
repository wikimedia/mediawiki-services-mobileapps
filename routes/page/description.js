'use strict';

const BBPromise = require('bluebird');
const sUtil = require('../../lib/util');
const HTTPError = sUtil.HTTPError;
const mwapi = require('../../lib/mwapi');
const mUtil = require('../../lib/mobile-util');

/**
 * The main router object
 */
const router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
let app;

/**
 * GET {domain}/v1/page/description/{title}
 */
router.get('/description/:title', (req, res) => {
    return mwapi.getMetadataForDescription(req)
        .then((description) => {
            res.status(200);
            mUtil.setContentType(res, mUtil.CONTENT_TYPES.description);
            res.set('Content-Language', description.lang);
            res.send({ description: description.value });
            res.end();
        });
});

/**
 * PUT {domain}/v1/page/description/{title}
 */
router.put('/description/:title', (req, res) => {
    if (req.params.domain === 'en.wikipedia.org') {
        // Enwiki uses local short descriptions only,
        // setting those requires adding a ShortDescription
        // template on the page. It's not supported yet.
        throw new HTTPError({
            status: 501,
            type: 'unsupported_project',
            title: 'Unsupported project',
            detail: 'Setting page description is not supported for English Wikipedia.'
        });
    }
    if (!req.body.description) {
        throw new HTTPError({
            status: 400,
            type: 'bad_request',
            title: 'Invalid request',
            detail: 'Parameter required: body.description'
        });
    }
    // TODO: throw unsupported on enwiki
    return mwapi.setCentralDescription(req, req.body.description)
        .then((description) => {
            res.status(201);
            mUtil.setContentType(res, mUtil.CONTENT_TYPES.description);
            res.set('Content-Language', description.language);
            res.send({ description: description.value });
            res.end();
        });
});

/**
 * DELETE {domain}/v1/page/description/{title}
 */
router.delete('/description/:title', (req, res) => {
    if (req.params.domain === 'en.wikipedia.org') {
        // Enwiki uses local short descriptions only,
        // setting those requires adding a ShortDescription
        // template on the page. It's not supported yet.
        throw new HTTPError({
            status: 501,
            type: 'unsupported_project',
            title: 'Unsupported project',
            detail: 'Deleting page description is not supported for English Wikipedia.'
        });
    }
    return mwapi.setCentralDescription(req, '')
        .then(() => {
            res.status(204);
            res.end();
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
