'use strict';

const BBPromise = require('bluebird');
const preq = require('preq');
const domino = require('domino');
const extractLib = require('../lib/extract');
const mwapi = require('../lib/mwapi');
const mUtil = require('../lib/mobile-util');
const parse = require('../lib/parseProperty');
const parsoid = require('../lib/parsoid-access');
const sUtil = require('../lib/util');
const transforms = require('../lib/transforms');

/**
 * The main router object
 */
const router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
let app;

function drillDown(body) {
    const id = Object.keys(body.query.pages)[0];
    return body.query.pages[id];
}

function buildPreview(input) {
    const lead = domino.createDocument(input.page.sections[0].text);
    transforms.relocateFirstParagraph(lead);
    const obj = drillDown(input.extract.body);
    return {
        title: obj && obj.title,
        extract: obj && extractLib.format(obj.extract),
        thumbnail: mUtil.defaultVal(mUtil.filterEmpty({
            source: obj && obj.thumbnail && obj.thumbnail.source
        })),
        infobox: parse.parseInfobox(lead)
    };
}

/**
 * GET {domain}/v1/page/mobile-summary/{title}
 * Gets the preview for the given page title.
 */
router.get('/mobile-summary/:title', function (req, res) {
    return BBPromise.props({
        page: parsoid.pageContentPromise(app, req),
        extract: mwapi.requestExtract(app, req)
    }).then(function (response) {
        const revision = response.page.revision;
        response = buildPreview(response);
        res.status(200);
        mUtil.setETag(req, res, revision);
        mUtil.setContentType(res, mUtil.CONTENT_TYPES.unpublished);
        res.json(response).end();
    });
});

module.exports = function (appObj) {
    app = appObj;
    return {
        path: '/page',
        api_version: 1,
        router: router
    };
};
