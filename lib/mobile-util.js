'use strict';

var underscore = require('underscore');
var uuid = require('cassandra-uuid').TimeUuid;
var HTTPError = require('./util').HTTPError;
var mUtil = {};


/**
 * @returns true if val is null, undefined, an empty object, an empty array, or
 *          an empty string.
 */
mUtil.isEmpty = function(val) {
  return !underscore.isNumber(val)
      && !underscore.isBoolean(val)
      && underscore.isEmpty(val);
};

mUtil.isNonempty = underscore.negate(mUtil.isEmpty);

/**
 * @param [fallback]
 * @returns val if nonempty, else fallback.
*/
mUtil.defaultVal = function(val, fallback) {
    return underscore.isEmpty(val) ? fallback : val;
};

/**
 * @returns val less empty elements.
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

mUtil.setContentType = function(app, res) {
    let specVersion = app.conf.spec.info.version;
    res.type(`application/json; charset=utf-8; profile="https://www.mediawiki.org/wiki/Specs/content-services/${specVersion}"`);
};

/**
 * Sets the ETag header on the response object to a specified value.
 *
 * @param {Object}  response the HTTPResponse object on which to set the header
 * @param {Object}  value to set the ETag to
 */
mUtil.setETagToValue = function(response, value) {
    response.set('etag', '' + value);
};

/**
 * Sets the ETag header on the response object. First, the request object is
 * checked for the X-Restbase-ETag header. If present, that is used as the ETag
 * header. Otherwise, a new ETag is created, comprised of the revision ID and
 * the time UUID. If the latter is not given, the current time stamp is used to
 * generate it.
 *
 * @param {Object}  request  the HTTPRequest object to check for the X-Restbase-ETag header
 * @param {Object}  response the HTTPResponse object on which to set the header
 * @param {integer} revision the revision ID to use
 * @param {string}  tid      the time UUID to use; optional
 */
mUtil.setETag = function(request, response, revision, tid) {
    if (request && request.headers && request.headers['x-restbase-etag']) {
        response.set('etag', request.headers['x-restbase-etag']);
        return;
    }
    if (!tid) {
        tid = uuid.now().toString();
    }
    mUtil.setETagToValue(response, revision + '/' + tid);
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

// Merge two arrays of objects by the specified property.
// Stolen from https://jsfiddle.net/guya/eAWKR/.
mUtil.mergeByProp = function(arr1, arr2, prop, pushIfKeyNotFound) {
    underscore.each(arr2, function(arr2obj) {
        var arr1obj = underscore.find(arr1, function(arr1obj) {
            return arr1obj[prop] === arr2obj[prop];
        });

        // If the object already exists, extend it with the new values from
        // arr2, otherwise conditionally add the new object to arr1.
        if (arr1obj) {
            underscore.extend(arr1obj, arr2obj);
        } else {
            if (pushIfKeyNotFound) {
                arr1.push(arr2obj);
            }
        }
    });
};

/**
 * Takes an array of objects and makes the specified changes to the keys of each
 * member object.
 * @param {Array}  arr      an array of objects
 * @param {Array[]}  changes  an array of two-member arrays containing the desired
 *                          key changes, of the following form:
 *                          [['to', 'from'], ['to', 'from'], ...]
 */
mUtil.adjustMemberKeys = function(arr, changes) {
    for (var i = 0, n = arr.length; i < n; i++) {
        for (var j = 0, m = changes.length; j < m; j++) {
            if (arr[i][changes[j][1]]) {
                arr[i][changes[j][0]] = arr[i][changes[j][1]];
                delete arr[i][changes[j][1]];
            }
        }
    }
};

/**
 * Takes an array of objects and, for each object, creates the specified key (if
 * not already present) with the same value as the specified source key for each
 * change pair.
 * @param {Array}  arr      an array of objects
 * @param {Array[]}  changes  an array of two-member arrays containing the desired
 *                          key changes, of the following form:
 *                          [['to', 'from'], ['to', 'from'], ...]
 */
mUtil.fillInMemberKeys = function(arr, changes) {
    for (var i = 0, n = arr.length; i < n; i++) {
        for (var j = 0, m = changes.length; j < m; j++) {
            if (!arr[i][changes[j][0]]) {
                arr[i][changes[j][0]] = arr[i][changes[j][1]];
            }
        }
    }
};

/**
 * Construct an etag using the date from the feed endpoint request.
 * Example: '2016/03/05' -> '20160305/bb6b7552-2cea-11e6-8490-df3f275c37a6'
 */
mUtil.getDateStringEtag = function(dateString) {
    return dateString + '/' + uuid.now().toString();
};

mUtil.throw404 = function(message) {
    throw new HTTPError({
        status: 404,
        type: 'not_found',
        title: 'Not found',
        detail: message
    });
};

module.exports = mUtil;
