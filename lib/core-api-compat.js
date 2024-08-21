'use strict';

/**
 * @module lib/core-api-compact
 */

const uuid = require('cassandra-uuid').TimeUuid;

/**
 * Checks if an HTTP response is a redirect
 *
 * @param {Response} response the parsoid response object
 * @return {Boolean} is redirect flag
 */
function isRedirect(response) {
	if ((response.status < 400) && (response.status >= 300)) {
		return true;
	}
	return false;
}

/**
 * HTTP title redirect error
 */
class HTTPTitleRedirectError extends Error {
	/**
	 * @constructs
	 * @param {Object} params initial request parameters
	 * @param {String} title title to redirect to
	 */
	constructor(params, title) {
		const message = `HTTP response redirects to location: ${ title }`;
		super(message);
		this.name = 'HTTPTitleRedirectError';
		this.title = title;
		this.params = params;
	}
}

/**
 * Compatibility layer for parsoid served from MW core
 * Calls the REST API with the supplied domain, path and request parameters
 *
 * @param {!Object} req the incoming request object
 * @param {!Object} [restReq={}] the object containing the REST request details
 * @return {!Promise} a promise resolving as the response object from the REST API
 */
function coreAPIParsoidGet(req, restReq) {

	const app = req.app;

	if (!req.params.revision) {
		// We only query parsoid with a title (no revision)
		restReq.params.title = encodeURIComponent(req.params.title);
		const params = req.params;
		return req.issueRequest(app.corepagehtml_tpl.expand({ request: restReq }))
			.then((response) => {

				// Handle parsoid redirect
				if (isRedirect(response)) {
					const r = /.*\/v1\/page\/(?<title>.*)\/with_html/;
					const matches = r.exec(response.headers.location);
					throw new HTTPTitleRedirectError(params, matches.groups.title);
				}

				// Compat: rewrite etag header and body to be the same format as the
				// responses from parsoid on restbase
				const html = response.body.html;
				const revision = response.body.latest.id;
				const timestamp = response.body.latest.timestamp;
				const tid = uuid.fromDate(new Date(timestamp)).toString();
				const etag = `${ revision }/${ tid }`;
				response.body = html;
				response.headers.etag = etag;
				return response;
			});
	} else {
		// We query parsoid both with a page and a revision
		restReq.params.revision = req.params.revision;
		return req.issueRequest(app.corerevisionhtml_tpl.expand({ request: restReq }))
			.then((response) => {
				// Compat: rewrite etag header and body to be the same format as the
				// responses from parsoid on restbase
				const html = response.body.html;
				const revision = response.body.id;
				const timestamp = response.body.timestamp;
				const tid = uuid.fromDate(new Date(timestamp)).toString();
				const etag = `${ revision }/${ tid }`;
				response.body = html;
				response.headers.etag = etag;
				return response;
			});
	}
}

/**
 * Checks if a request is made explicitly for the MW REST API parsoid endpoint
 *
 * @param {!Object} req the incoming request object
 * @return {boolean} flag value
 */
function isExplicitCoreParsoidReq(req) {
	const header = 'X-Use-MW-REST-Parsoid';
	const value = req.header(header);
	return value === 'true';
}

// RESTBase rewrite rules
const pcsPattern = /\/(?<domain>.*)(\/v1\/)(?<endpoint>.*)/;
const restbaseRewriteRule = '//$<domain>/api/rest_v1/$<endpoint>';

/**
 * HTTP redirect middleware
 */
function httpTitleRedirectErrorMiddleware(error, req, res, next) {
	const isTitleRedirect = error instanceof HTTPTitleRedirectError;
	const hasTitleRedirectLocation = typeof req.getTitleRedirectLocation !== 'undefined';
	if (isTitleRedirect && hasTitleRedirectLocation) {
		let location = req.getTitleRedirectLocation(error.params.domain, error.title);
		if (req.app.conf.pcs_returns_absolute_redirects) {
			location = location.replace(pcsPattern, restbaseRewriteRule);
		}
		return res.redirect(location);
	}
	next(error);
}

/**
 * Add content-language headers
 */
function addContentLangFromMeta(res, doc) {
	if (!res.getHeader('content-language')) {
		const query = 'meta[http-equiv="content-language"]';
		const contentLangMeta = doc.querySelector(query);
		if (contentLangMeta) {
			res.setHeader('content-language', contentLangMeta.getAttribute('content'));
		}
	}
}

module.exports = {
	coreAPIParsoidGet,
	isExplicitCoreParsoidReq,
	isRedirect,
	httpTitleRedirectErrorMiddleware,
	HTTPTitleRedirectError,
	addContentLangFromMeta
};
