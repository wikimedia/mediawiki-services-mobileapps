'use strict';

/**
 * @module lib/mobile-util
 */

const P = require('bluebird');
const domino = require('domino');
const assert = require('assert');
const underscore = require('underscore');
const uuid = require('cassandra-uuid').TimeUuid;
const HTTPError = require('./util').HTTPError;
const mUtil = {};
const constants = require('./constants');

mUtil.CONTENT_TYPES = {
	html: { name: 'HTML', version: '2.1.0', type: 'text/html' },
	mobileSections: { name: 'mobile-sections', version: '0.14.5', type: 'application/json' },
	media: { name: 'Media', version: '1.4.5', type: 'application/json' },
	mobileHtml: { name: 'Mobile-HTML', version: '1.2.2', type: 'text/html' },
	metadata: { name: 'Metadata', version: '1.3.0', type: 'application/json' },
	summary: { name: 'Summary', version: '1.5.0', type: 'application/json' },
	definition: { name: 'definition', version: '0.8.1', type: 'application/json' },
	description: { name: 'description', version: '0.0.1', type: 'application/json' },
	css: { name: 'CSS', version: '2.0.0', type: 'text/css' },
	javascript: { name: 'JavaScript', version: '1.0.0', type: 'text/javascript' },
	unpublished: { name: 'Unpublished', version: '0.0.0', type: 'application/json' },
	mobileHtmlOfflineResources: {
		name: 'Mobile-HTML-Offline-Resources',
		version: '1.2.1',
		type: 'application/json'
	},
	talk: { name: 'Talk', version: '0.1.1', type: 'application/json' },
	mediaList: { name: 'MediaList', version: '1.1.0', type: 'application/json' },
	i18n: { name: 'i18n', version: '0.0.1', type: 'application/json' }
};

/**
 * Pass on the Content-Security-Policy HTTP header for html content-type endpoints
 *
 * @param {!Object} response the HTTPResponse object on which to set the headers
 * @param {!string} value the CSP value to set
 */
mUtil.setContentSecurityPolicy = (response, value) => {
	// Note that .set will over-write, not expand
	response.set('content-security-policy', value);
	response.set('x-content-security-policy', value);
	response.set('x-webkit-csp', value);
};

/**
 * Compatibility layer with Security Headers implemented by RESTBase
 *
 * @param {!Object} response the HTTPResponse object on which to set the headers
 */
mUtil.setRestBaseCompatSecurityHeaders = (res) => {
	// Set up basic CORS headers
	res.set('access-control-allow-origin', '*');
	res.set('access-control-allow-methods', 'GET,HEAD');
	res.set('access-control-allow-headers',
		'accept, content-type, content-length, cache-control, accept-language, ' +
		'api-user-agent, if-match, if-modified-since, if-none-match, ' +
		// There's a bug in Safari 9 that makes it require these as allowed headers
		'dnt, accept-encoding');
	res.set('access-control-expose-headers', 'etag');

	// Set up security headers
	// https://www.owasp.org/index.php/List_of_useful_HTTP_headers
	res.set('x-content-type-options', 'nosniff');
	res.set('x-frame-options', 'SAMEORIGIN');

	// Restrict referrer forwarding
	// (https://phabricator.wikimedia.org/T173509)
	res.set('referrer-policy', 'origin-when-cross-origin');

	res.set('x-xss-protection', '1; mode=block');
};

/**
 * Get the host for the given request
 *
 * @param {!string} baseURI the base URI
 * @param {!Object} req the request object
 * @return {!string} updated baseURI
 */
const replaceHost = (baseURI, req) => {
	const host = req.headers.host || req.hostname || req.params.domain || 'en.wikipedia.org';
	return baseURI.replace('{{host}}', host);
};

/**
 * Get the API base URI to use for MetaWiki requests. Used for PCS CSS & JS.
 * For example, https://meta.wikimedia.org/api/rest_v1/data/javascript/mobile/pcs
 *
 * @param {!Object} app the application object
 * @param {!Object} req the request object
 * @return {!string} the baseURI
 */
mUtil.getMetaWikiRESTBaseAPIURI = (app, req) => {
	const baseURI = app.conf.mobile_html_rest_api_base_uri;
	// Only replace the host token on debug
	// Prod & labs should have the host hardcoded into the URI
	if (app.conf.use_request_host) {
		return replaceHost(baseURI, req);
	}
	return baseURI;
};

/**
 * Get the API base URI to use for local requests. Used for i18n because the strings should
 * be loaded from the local wiki - for example, https://zh.wikipedia.org/api/rest_v1/data/i18n/pcs
 *
 * @param {!Object} app the application object
 * @param {!Object} req the request object
 * @return {!string} the baseURI
 */
mUtil.getLocalRESTBaseAPIURI = (app, req) => {
	// Domain is the wiki domain. For dev and labs, it becomes a path component: http://localhost:8888/{{domain}}/v1/page/mobile-html/Dog
	// For prod, it becomes the hostname: https://{{domain}}/api/rest_v1/page/mobile-html/Dog
	const domain = req.params.domain || 'en.wikipedia.org';
	const baseURI = app.conf.mobile_html_local_rest_api_base_uri_template.replace('{{domain}}', domain);
	// Only replace the host token on debug
	// Prod & labs should have the host hardcoded into the URI
	if (app.conf.use_request_host) {
		return replaceHost(baseURI, req);
	}
	return baseURI;
};

/**
 * @param {!string} spec
 * @return {Object}
 */
mUtil.getContentTypeString = function(spec) {
	return `${ spec.type }; charset=utf-8; profile="https://www.mediawiki.org/wiki/Specs/${ spec.name }/${ spec.version }"`;
};

/**
 * @param {Object} res
 * @param {Object} spec
 */
mUtil.setContentType = function(res, spec) {
	if (!spec.name || !spec.version) {
		throw new HTTPError({
			status: 500,
			type: 'invalid_content_type',
			title: 'Only use the allowed content-types',
			detail: `${ spec.name }/${ spec.version } is not an allowed content-type!`
		});
	}

	res.type(mUtil.getContentTypeString(spec));
};

/**
 * Check if a variable is empty.
 *
 * @param {string} val input value
 * @return {!boolean} true if val is null, undefined, an empty object, an empty array, or an empty
 * string.
 */
mUtil.isEmpty = function(val) {
	return !underscore.isNumber(val)
        && !underscore.isBoolean(val)
        && underscore.isEmpty(val);
};

mUtil.isNonempty = underscore.negate(mUtil.isEmpty);

/**
 * @param {*} val input value
 * @param {*} [fallback] the default value to assign if val is empty
 * @return {*} val if nonempty, else fallback.
 */
mUtil.defaultVal = function(val, fallback) {
	return underscore.isEmpty(val) ? fallback : val;
};

/**
 * @param {*} val input value
 * @return {*} val less empty elements.
 */
mUtil.filterEmpty = function(val) {
	if (Array.isArray(val)) {
		return val.map(mUtil.filterEmpty).filter(mUtil.isNonempty);
	}
	if (underscore.isObject(val)) {
		return underscore.pick(underscore.mapObject(val, mUtil.filterEmpty), mUtil.isNonempty);
	}
	return val;
};

/**
 * Sets the ETag header on the response object, comprised of the revision ID and
 * the time UUID. If the latter is not given, the current time stamp is used to
 * generate it.
 *
 * @param {!Object} response The HTTPResponse object on which to set the header
 * @param {!number|string} revision The revision integer ID to use
 * @param {?string} tid      The time UUID to use; optional
 */
mUtil.setETag = function(response, revision, tid = undefined) {
	assert(['string','number'].includes(typeof revision));
	assert(['string','undefined'].includes(typeof tid));
	if (!tid) {
		tid = uuid.now().toString();
	}
	response.set('etag', `"${ revision }/${ tid }"`);
};

/**
 * Pass on the Vary and Content-Language HTTP headers from Parsoid if set
 *
 * @param {!Object} response The HTTPResponse object on which to set the headers
 * @param {?number} headers  The incoming response's headers from which to read
 */
mUtil.setLanguageHeaders = (response, headers) => {
	if (headers) {
		// Downcast all keys to lower-case, as the spec doesn't require it.
		const lowerHeaders = Object.keys(headers).reduce((newHeaders, key) => {
			newHeaders[key.toLowerCase()] = headers[key];
			return newHeaders;
		}, {});

		if (lowerHeaders.vary) {
			const vary = lowerHeaders.vary.split(',')
				.map(e => e.trim())
				.filter(e => !/^[Aa]ccept$/.test(e))
				.join(', ');

			// Note that .vary will expand, not over-write
			if (vary) {
				response.vary(vary);
			}
		}
		if (lowerHeaders['content-language']) {
			// Note that .set will over-write, not expand
			response.set('Content-Language', lowerHeaders['content-language']);
		}
	}
};

/**
 * Swaps a domain's lowest-level subdomain with the provided language code.
 * This is assumed to be invalid for provided domains with two or fewer levels, and the domain is
 * returned unchanged.
 * Example: ('en.wikipedia.org', 'de') -> 'de.wikipedia.org'
 * Example: ('de.wikipedia.beta.wmflabs.org', 'ja') -> 'ja.wikipedia.beta.wmflabs.org'
 * Example: ('mediawiki.org', 'es') -> 'mediawiki.org'
 *
 * @param {!string} domain
 * @param {string} en
 * @return {string}
 */
mUtil.domainForLangCode = (domain, code) => {
	return domain.split('.').length < 3 ? domain : `${ code }${ domain.slice(domain.indexOf('.')) }`;
};

/* jslint bitwise: true */
/* eslint no-bitwise: ["error", { "allow": ["<<"] }] */
/**
 * @param {!string} string
 * @return {string}
 */
mUtil.hashCode = function(string) {
	return string.split('').reduce((prevHash, currVal) =>
		((prevHash << 5) - prevHash) + currVal.charCodeAt(0), 0);
};

/**
 * Gets the data-mw-section-id for the section containing the element.
 *
 * @param {!Element} el An Element
 * @return {?integer} the data-mw-section-id for the section containing the element
 */
mUtil.getSectionIdForElement = (el) => {
	const section = el.closest('section');
	return section && parseInt(section.getAttribute('data-mw-section-id'), 10);
};

/**
 * Historically, the MediaWiki API indicated boolean values in responses by including the property
 * with a value of "" if true, and omitting the property if false.  JSON format version 2, which
 * we always request, specifies that fields with boolean values should return true boolean 'true'
 * or 'false' values.  However, not all API modules have been updated to implement formatversion=2.
 * This method can be used to handle both cases and to guard against unexpected changes in modules
 * not yet updated.
 *
 * @param {!Object} obj enclosing object
 * @param {!string} prop property with a boolean meaning
 * @return {!boolean} true if the value means true in either API format
 */
mUtil.mwApiTrue = (obj, prop) => {
	return obj[prop] === true || obj[prop] === '';
};

/**
 * Creates a domino Document object from an HTML text string.
 * Takes advantage of functionality provided by domino's internal HTMLParser implementation,
 * but not exposed in its public API via the createDocument() method, to allow parsing an HTML
 * string in chunks.
 * Returns a Promise resolving as a Document rather than synchronously parsing and returning the
 * Document as in Domino's own implementation.
 *
 * @param {?string} html HTML string
 * @return {!Promise} a promise resolving in a Domino HTML document representing the input
 */
mUtil.createDocument = (html) => {
	if (typeof html !== 'string') {
		return P.reject(new HTTPError({
			status: 500,
			type: 'invalid_parameter_type',
			title: 'HTML input should be a string'
		}));
	}

	function _pauseAfter(ms) {
		const start = Date.now();
		return () => (Date.now() - start) >= ms;
	}

	function _processIncremental(parser) {
		return new P((res, rej) => setImmediate(() => {
			try {
				if (parser.process(_pauseAfter(constants.MAX_MS_PER_TICK))) {
					res(_processIncremental(parser));
				} else {
					res(parser.document());
				}
			} catch (e) {
				rej(e);
			}
		}));
	}

	return P.resolve(domino.createIncrementalHTMLParser())
		.then((parser) => {
			parser.end(html);
			return _processIncremental(parser);
		});
};

module.exports = mUtil;
