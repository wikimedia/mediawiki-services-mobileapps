'use strict';

const underscore = require('underscore');
const uuid = require('cassandra-uuid').TimeUuid;
const HTTPError = require('./util').HTTPError;
const mUtil = {};

mUtil.CONTENT_TYPES = {
    html: { name: 'HTML', version: '1.6.1', type: 'text/html' },
    mobileSections: { name: 'mobile-sections', version: '0.14.0', type: 'application/json' },
    media: { name: 'Media', version: '1.2.0', type: 'application/json' },
    readHtml: { name: 'ReadHtml', version: '0.1.0', type: 'text/html' },
    references: { name: 'References', version: '1.0.0', type: 'application/json' },
    metadata: { name: 'Metadata', version: '1.1.0', type: 'application/json' },
    summary: { name: 'Summary', version: '1.3.6', type: 'application/json' },
    definition: { name: 'definition', version: '0.8.0', type: 'application/json' },
    random: { name: 'random', version: '0.6.0', type: 'application/json' },
    announcements: { name: 'announcements', version: '0.2.0', type: 'application/json' },
    onthisday: { name: 'onthisday', version: '0.3.3', type: 'application/json' },
    css: { name: 'CSS', version: '1.0.0', type: 'text/css' },
    availability: { name: 'availability', version: '1.0.0', type: 'application/json' },
    unpublished: { name: 'unpublished', version: '0.0.0', type: 'application/json' }
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
 * Sets the ETag header on the response objecti, comprised of the revision ID and
 * the time UUID. If the latter is not given, the current time stamp is used to
 * generate it.
 * @param {!Object}  response the HTTPResponse object on which to set the header
 * @param {?number} revision the revision integer ID to use
 * @param {?string}  tid      the time UUID to use; optional
 */
mUtil.setETag = function(response, revision, tid) {
    // we want to bail out if the revision hasn't been supplied, except
    // in the case revision === 0 because 0 is actually a valid rev_id
    if (!revision && revision !== 0) {
        return;
    }
    if (!tid) {
        tid = uuid.now().toString();
    }
    response.set('etag', `"${revision}/${tid}"`);
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

module.exports = mUtil;
