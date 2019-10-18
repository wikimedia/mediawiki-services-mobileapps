const router = require('../../lib/util').router();
const mUtil = require('../../lib/mobile-util');
const parsoidApi = require('../../lib/parsoid-access');
const TalkPage = require('../../lib/talk/TalkPage');
const wikiLanguage = require('../../lib/wikiLanguage');

/**
 * The main application object reported when this module is required.
 */
let app;
/**
 * GET {domain}/v1/page/talk/{title}{/revision}{/tid}
 * Gets talk page info.
 */
router.get('/talk/:title/:revision?/:tid?', (req, res) => {
    const lang = wikiLanguage.getLanguageCode(req.params.domain);
    return parsoidApi.getParsoidHtml(req)
    .then(parsoidRsp => mUtil.createDocument(parsoidRsp.body)
    .then(doc => TalkPage.promise(doc, lang)
    .then(talkPage => {
      res.status(200);
      const revTid = parsoidApi.getRevAndTidFromEtag(parsoidRsp.headers);
      mUtil.setETag(res, revTid.revision, revTid.tid);
      mUtil.setContentType(res, mUtil.CONTENT_TYPES.talk);
      mUtil.setLanguageHeaders(res, parsoidRsp.headers);
      res.json(talkPage).end();
    })));
});

module.exports = function(appObj) {
    app = appObj;
    return {
        path: '/page',
        api_version: 1,
        router
    };
};
