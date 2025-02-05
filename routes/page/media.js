'use strict';

/**
 * @module routes/page/media
 */

const BBPromise = require('bluebird');
const mUtil = require('../../lib/mobile-util');
const parsoid = require('../../lib/parsoid-access');
const sUtil = require('../../lib/util');
const mwapi = require('../../lib/mwapi');
const lib = require('../../lib/media');
const caching = require('../../lib/caching');

const router = sUtil.router();
let app;

/**
 * GET {domain}/v1/page/media-list/{title}{/revision}{/tid}
 * Title redirection status: Redirects based on parsoid output
 * Returns the non-UI media files used on the given page.
 */
router.get('/media-list/:title/:revision?/:tid?', caching.defaultCacheMiddleware, (req, res) => {
	req.getTitleRedirectLocation = (domain, title) => `/${ domain }/v1/page/media-list/${ title }`;
	req.purgePaths = [
		`/page/media-list/${ encodeURIComponent(req.params.title) }`,
		...(req.params.revision ? [`/page/media-list/${ encodeURIComponent(req.params.title) }/${ req.params.revision }`] : [])
	];

	// Configure cache headers
	res.setHeader('Cache-Control', req.app.conf.cache_headers['media-list']);

	const buildMediaList = (title) => {
		req.params.title = title;
		return parsoid.getParsoidHtml(req).then(parsoidRsp => mUtil.createDocument(parsoidRsp.body).then(doc => BBPromise.props({
			pageMediaList: lib.getMediaItemInfoFromDoc(doc),
			mw: mwapi.getMetadataForMobileHtml(req)
		}).then((response) => {
			// T269312 - Set the leadImage flag to true if
			// its value corresponds to mwapi response
			Object.values(response.pageMediaList).forEach((item) => {
				if (item.srcset &&
							response.mw.pageprops &&
							response.mw.pageprops.page_image_free &&
							decodeURI(item.srcset[0].src)
								.includes(response.mw.pageprops.page_image_free)
				) {
					item.leadImage = true;
				}
			});
			const revTid = parsoid.getRevAndTidFromEtag(parsoidRsp.headers);
			mUtil.setETag(res, revTid.revision, revTid.tid);
			mUtil.setContentType(res, mUtil.CONTENT_TYPES.mediaList);
			mUtil.setLanguageHeaders(res, parsoidRsp.headers);
			res.json({
				revision: revTid.revision,
				tid: revTid.tid,
				items: response.pageMediaList
			});
		})));
	};

	if (app.conf.pcs_handles_redirects) {
		return buildMediaList(req.params.title);
	}
	return BBPromise.resolve(mwapi.resolveTitleRedirect(req)).then(buildMediaList);
});

module.exports = function(appObj) {
	app = appObj;
	return {
		path: '/page',
		api_version: 1,
		router
	};
};
