const router = require('../../lib/util').router();
const talkParser = require('../../lib/talk/parser');
const mUtil = require('../../lib/mobile-util');
const parsoidApi = require('../../lib/parsoid-access');

/**
 * The main application object reported when this module is required.
 */
let app;

const fetchParsoidHtmlForTitle = (app, req, title) => {
  const parsoidReq = Object.create(req);
  parsoidReq.params.title = title;
  return parsoidApi.getParsoidHtml(app, parsoidReq);
};

const fetchDocAndRevision = (app, req) => {
  let revision;
  return fetchParsoidHtmlForTitle(app, req, req.params.title)
  .then((response) => {
      revision = parsoidApi.getRevisionFromEtag(response.headers);
      return response.body;
  })
  .then(mUtil.createDocument)
  .then(doc => [doc, revision]);
};

/**
 * GET {domain}/v1/page/talk/{title}{/revision}{/tid}
 * Gets talk page info.
 */
router.get('/talk/:title/:revision?/:tid?', (req, res) => {
  return fetchDocAndRevision(app, req)
    .then(docAndRevision => {
      const doc = docAndRevision[0];
      const revision = docAndRevision[1];
      const lang = req.params.domain.split('.')[0];

      const topicsWithReplies = talkParser.parseUserTalkPageDocIntoTopicsWithReplies(doc, lang);

      res.status(200);
      mUtil.setETag(res, revision);
      mUtil.setContentType(res, mUtil.CONTENT_TYPES.talk);
      res.json(topicsWithReplies).end();
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
