'use strict';

/**
 * @module lib/core-api-compact
 */

const BBPromise = require('bluebird');
const uuid = require('cassandra-uuid').TimeUuid;
const { HTTPError } = require('./util');

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
 * The corepagehtml_req template defined in production sets a host header and
 * a proxy domain.  However, request.js removes the host header when following
 * redirects that aren't status 307.  Some redirects from the core rest api, like
 * title normalization, use a 301, lose the header, and end up as 404.
 *
 * The followRequest function parses the title from the redirect and reissues
 * the request itself.
 *
 * @param {!Object} req
 * @param {!Object} [restReq={}]
 * @param {number} redirectsCount
 * @return {!Promise}
 */
function followRequest(req, restReq, redirectsCount = 0) {
	// Stop recursion after we hit the redirects limit
	const maxRedirects = req.app.conf.maxRedirects || 20;
	if (redirectsCount > maxRedirects) {
		throw new HTTPError({
			status: 500,
			type: 'internal_error',
			title: 'Max redirects exceeded'
		});
	}

	const app = req.app;
	const request = app.corepagehtml_tpl.expand({ request: restReq });
	request.followRedirect = false;
	return req.issueRequest(request)
		.then((response) => {
			if (!isRedirect(response)) {
				return Promise.resolve(response);
			}
			const r = /.*\/v1\/page\/(?<title>.*)\/with_html/;
			const matches = r.exec(response.headers.location);
			const title = matches.groups.title;
			if (app.conf.pcs_handles_redirects) {
				throw new HTTPTitleRedirectError(req.params, title);
			} else {
				restReq.params.title = title;
				return followRequest(req, restReq, redirectsCount + 1);
			}
		});
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
	if (!req.params.revision) {
		// We only query parsoid with a title (no revision)
		restReq.params.title = encodeURIComponent(req.params.title);
		return followRequest(req, restReq)
			.then((response) => {
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
		return req.issueRequest(req.app.corerevisionhtml_tpl.expand({ request: restReq }))
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
	addContentLangFromMeta,
	followRequest
};
