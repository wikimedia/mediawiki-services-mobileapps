'use strict';

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
    mobileHtml: { name: 'Mobile-HTML', version: '1.2.1', type: 'text/html' },
    metadata: { name: 'Metadata', version: '1.3.0', type: 'application/json' },
    summary: { name: 'Summary', version: '1.4.2', type: 'application/json' },
    definition: { name: 'definition', version: '0.8.1', type: 'application/json' },
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
 * Pass on the Content-Security-Policy HTTP header
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
 * Get the host for the given request
 * @param {!string} baseURI the base URI
 * @param {!Object} req the request object
 * @returns {!string} updated baseURI
 */
 const replaceHost = (baseURI, req) => {
    const host = req.headers.host || req.hostname || req.params.domain || 'en.wikipedia.org';
    return baseURI.replace('{{host}}', host);
 };

/**
 * Get the API base URI to use for MetaWiki requests. Used for PCS CSS & JS.
 * For example, https://meta.wikimedia.org/api/rest_v1/data/javascript/mobile/pcs
 * @param {!Object} app the application object
 * @param {!Object} req the request object
 * @returns {!string} the baseURI
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
 * @param {!Object} app the application object
 * @param {!Object} req the request object
 * @returns {!string} the baseURI
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

mUtil.getContentTypeString = function(spec) {
    return `${spec.type}; charset=utf-8; profile="https://www.mediawiki.org/wiki/Specs/${spec.name}/${spec.version}"`;
};

mUtil.setContentType = function(res, spec) {
    if (!spec.name || !spec.version) {
        throw new HTTPError({
            status: 500,
            type: 'invalid_content_type',
            title: 'Only use the allowed content-types',
            detail: `${spec.name}/${spec.version} is not an allowed content-type!`
        });
    }

    res.type(mUtil.getContentTypeString(spec));
};

/**
 * Check if a variable is empty.
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
    response.set('etag', `"${revision}/${tid}"`);
};

/**
 * Pass on the Vary and Content-Language HTTP headers from Parsoid if set
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
 * Convert mobile to canonical domain,
 * e.g., 'en.m.wikipedia.org' => 'en.wikipedia.org'
 */
mUtil.mobileToCanonical = function(domain) {
    return domain.replace('.m.', '.');
};

/**
 * Remove the top-level domain from a domain string, e.g., 'en.wikipedia.org' ->
 * 'en.wikipedia'.
 */
mUtil.removeTLD = function(domain) {
    return domain.split('.').slice(0,2).join('.');
};

/**
 * Swaps a domain's lowest-level subdomain with the provided language code.
 * This is assumed to be invalid for provided domains with two or fewer levels, and the domain is
 * returned unchanged.
 * Example: ('en.wikipedia.org', 'de') -> 'de.wikipedia.org'
 * Example: ('de.wikipedia.beta.wmflabs.org', 'ja') -> 'ja.wikipedia.beta.wmflabs.org'
 * Example: ('mediawiki.org', 'es') -> 'mediawiki.org'
 */
mUtil.domainForLangCode = (domain, code) => {
    return domain.split('.').length < 3 ? domain : `${code}${domain.slice(domain.indexOf('.'))}`;
};

mUtil.removeFragment = function(href) {
    if (href.indexOf('#') > -1) {
        return href.substring(0, href.indexOf('#'));
    }
    return href;
};

mUtil.removeLinkPrefix = function(href) {
    return href.replace(/^\.\//, '');
};

mUtil.extractDbTitleFromAnchor = function(anchor) {
    return anchor && mUtil.removeFragment(mUtil.removeLinkPrefix(anchor.getAttribute('href')));
};

mUtil.getRbPageSummaryUrl = function(restbaseTpl, domain, title) {
    const request = restbaseTpl.expand({
        request: {
            params: {
                domain,
                path: `page/summary/${encodeURIComponent(title)}` },
        }
    });
    return request.uri;
};

mUtil.throw404 = function(message) {
    throw new HTTPError({
        status: 404,
        type: 'not_found',
        title: 'Not found',
        detail: message
    });
};

mUtil.deduplicate = function(array) {
    return Array.from(new Set(array));
};

/* jslint bitwise: true */
/* eslint no-bitwise: ["error", { "allow": ["<<"] }] */
mUtil.hashCode = function(string) {
    return string.split('').reduce((prevHash, currVal) =>
        ((prevHash << 5) - prevHash) + currVal.charCodeAt(0), 0);
};

/**
 * Gets the data-mw-section-id for the section containing the element.
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
