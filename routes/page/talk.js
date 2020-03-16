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
      // Store the processing time to read after the response is sent
      const processingTime = talkPage.processingTime;
      // Set the processing time to undefined on the talk page so that
      // it's not included in the response
      talkPage.processingTime = undefined;
      const result = Object.assign({ revision: parseInt(revTid.revision) }, talkPage);
      mUtil.setETag(res, revTid.revision, revTid.tid);
      mUtil.setContentType(res, mUtil.CONTENT_TYPES.talk);
      mUtil.setLanguageHeaders(res, parsoidRsp.headers);
      res.json(result).end();
      if (processingTime) {
        app.metrics.timing('page_talk.processing', processingTime);
      }
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
