const BBPromise = require('bluebird');
const domUtil = require('../../lib/domUtil');
const mwapi = require('../../lib/mwapi');
const mUtil = require('../../lib/mobile-util');
const parsoidApi = require('../../lib/parsoid-access');
const sUtil = require('../../lib/util');
const router = sUtil.router();
const parsoidSections = require('../../lib/sections/parsoidSections');

/**
 * The main application object reported when this module is require()d
 */
let app;

/**
 * GET {domain}/v1/page/talk/{title}{/revision}{/tid}
 * Gets talk page info.
 */
router.get('/talk/:title/:revision?/:tid?', (req, res) => {
    return BBPromise.props({
        parsoid: parsoidApi.pageDocumentPromise(app, req, true),
        mw: mwapi.getMetadataForMobileHtml(app, req)
    }).then((response) => {
        res.status(200);
        mUtil.setContentType(res, mUtil.CONTENT_TYPES.talk);
        mUtil.setETag(res, response.parsoid.meta.revision);
        mUtil.setLanguageHeaders(res, response.parsoid.meta._headers);
        // Don't poison the client response with the internal _headers object
        delete response.parsoid.meta._headers;
        const sections = parsoidSections.getSectionsText(response.parsoid.document, req.logger);
        res.send(JSON.stringify(sections)).end();
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
