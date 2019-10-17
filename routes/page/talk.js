const router = require('../../lib/util').router();
const talkParser = require('../../lib/talk/parser');
const mUtil = require('../../lib/mobile-util');
const parsoidApi = require('../../lib/parsoid-access');
const rmElements = require('../../lib/transformations/rmElements');
const rmAttributes = require('../../lib/transformations/rmAttributes');

/**
 * The main application object reported when this module is required.
 */
let app;

/**
 * GET {domain}/v1/page/talk/{title}{/revision}{/tid}
 * Gets talk page info.
 */
router.get('/talk/:title/:revision?/:tid?', (req, res) => {
    return parsoidApi.getParsoidHtml(req)
    .then(parsoidRsp => mUtil.createDocument(parsoidRsp.body)
    .then((doc) => {

        rmElements(doc, 'path, clippath, script, noscript, defs, style, form, svg, abbr');
        rmAttributes(doc, '*', ['style','id','class','rel','about','data-mw','typeof']);

        const lang = req.params.domain.split('.')[0];
        const topicsWithReplies = talkParser.parseUserTalkPageDocIntoTopicsWithReplies(doc, lang);

        res.status(200);
        const revTid = parsoidApi.getRevAndTidFromEtag(parsoidRsp.headers);
        mUtil.setETag(res, revTid.revision, revTid.tid);
        mUtil.setContentType(res, mUtil.CONTENT_TYPES.talk);
        mUtil.setLanguageHeaders(res, parsoidRsp.headers);
        res.json(topicsWithReplies).end();
    }));
});

module.exports = function(appObj) {
    app = appObj;
    return {
        path: '/page',
        api_version: 1,
        router
    };
};
