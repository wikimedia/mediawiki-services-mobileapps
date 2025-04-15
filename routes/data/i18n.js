'use strict';

/**
 * @module routes/data/i18n
 */

const sUtil = require('../../lib/util');
const Localizer = require('../../lib/mobile/Localizer');
const mUtil = require('../../lib/mobile-util');
const router = sUtil.router();

router.get('/pcs', (req, res) => {
	const locales = Localizer.getLocalesFromReq(req);
	Localizer.getMessagesAndFallbacksForLocales(locales).then(messages => {
		const result = { locale: locales[0], messages };
		const resultString = JSON.stringify(result);
		res.status(200);
		mUtil.setContentType(res, mUtil.CONTENT_TYPES.i18n);
		mUtil.setETag(res, mUtil.hashCode(resultString));
		res.set('Cache-Control', req.app.conf.cache_headers['static-assets']);
		res.end(resultString);
	});
});

module.exports = function(appObj) {
	return {
		path: '/data/i18n',
		api_version: 1,
		router
	};
};
