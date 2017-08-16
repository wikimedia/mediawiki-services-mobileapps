'use strict';

const underscore = require('underscore');
const uuid = require('cassandra-uuid').TimeUuid;
const HTTPError = require('./util').HTTPError;
const mUtil = {};


mUtil.CONTENT_TYPES = {
    mobileSections: { name: 'mobile-sections', version: '0.12.2' },
    definition: { name: 'definition', version: '0.7.2' },
    random: { name: 'random', version: '0.6.0' },
    announcements: { name: 'announcements', version: '0.1.0' },
    compilations: { name: 'compilations', version: '0.1.0' },
    onthisday: { name: 'onthisday', version: '0.2.0' },
    unpublished: { name: 'unpublished', version: '0.0.0' }
};

mUtil.setContentType = function(res, spec, mainType = 'application/json') {
    if (!spec.name || !spec.version) {
        throw new HTTPError({
            status: 500,
            type: 'invalid_content_type',
            title: 'Only use the allowed content-types',
            detail: `${spec.name}/${spec.version} is not an allowed content-type!`
        });
    }

    res.type(`${mainType}; charset=utf-8; profile="https://www.mediawiki.org/wiki/Specs/${spec.name}/${spec.version}"`);
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
 * Get the language of the wiki base don the domain name.
 * Example: 'en.wikipedia.org' -> 'en'.
 */
mUtil.getLanguageFromDomain = function(domain) {
    return domain.split('.')[0];
};

mUtil.isEnglishWikipedia = function(domain) {
    return (domain === 'en.wikipedia.org' || domain === 'en.wikipedia.beta.wmflabs.org');
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

// Merge two arrays of objects by the specified property.
// Stolen from https://jsfiddle.net/guya/eAWKR/.
mUtil.mergeByProp = function(arr1, arr2, prop, pushIfKeyNotFound) {
    if (!arr1 || !arr2) {
        return;
    }

    arr2.forEach((arr2obj) => {
        const arr1obj = arr1.find((arr1obj) => {
            return arr1obj[prop] === arr2obj[prop];
        });

        // If the object already exists, extend it with the new values from
        // arr2, otherwise conditionally add the new object to arr1.
        if (arr1obj) {
            Object.assign(arr1obj, arr2obj);
        } else if (pushIfKeyNotFound) {
            arr1.push(arr2obj);
        }
    });
};

/**
 * Takes an array of objects and makes the specified changes to the keys of each
 * member object. E.g., adjustMemberKeys(arr, ['to', 'from'], ['to', 'from'], ...)
 * @param {!Array} arr an array of objects that will receive the change pairs passed in as
 * additional params
 */
mUtil.adjustMemberKeys = function(arr) {
    for (let i = 0, n = arr.length; i < n; i++) {
        for (let j = 1, m = arguments.length; j < m; j++) {
            if (arr[i][arguments[j][1]]) {
                arr[i][arguments[j][0]] = arr[i][arguments[j][1]];
                delete arr[i][arguments[j][1]];
            }
        }
    }
};

/**
 * Takes an array of objects and, for each object, creates the specified key (if
 * not already present) with the same value as the specified source key for each
 * change pair passed in as an additional parameter.
 * E.g., fillInMemberKeys(arr, ['to', 'from'], ['to', 'from'], ...)
 * @param {!Array} arr an array of objects that will receive the change pairs passed in as
 * additional params
 */
mUtil.fillInMemberKeys = function(arr) {
    for (let i = 0, n = arr.length; i < n; i++) {
        for (let j = 1, m = arguments.length; j < m; j++) {
            if (!arr[i][arguments[j][0]]) {
                arr[i][arguments[j][0]] = arr[i][arguments[j][1]];
            }
        }
    }
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


/* jslint bitwise: true */
/* eslint no-bitwise: ["error", { "allow": ["<<"] }] */
mUtil.hashCode = function(string) {
    return string.split('').reduce((prevHash, currVal) =>
       ((prevHash << 5) - prevHash) + currVal.charCodeAt(0), 0);
};

module.exports = mUtil;
