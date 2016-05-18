'use strict';

var underscore = require('underscore');
var uuid = require('cassandra-uuid').TimeUuid;

/**
 * @returns true if val is null, undefined, an empty object, an empty array, or
 *          an empty string.
 */
function isEmpty(val) {
  return !underscore.isNumber(val)
      && !underscore.isBoolean(val)
      && underscore.isEmpty(val);
}

var isNonempty = underscore.negate(isEmpty);

/**
 * @param [fallback]
 * @returns val if nonempty, else fallback.
*/
function defaultVal(val, fallback) {
    return underscore.isEmpty(val) ? fallback : val;
}

/**
 * @returns val less empty elements.
*/
function filterEmpty(val) {
    if (Array.isArray(val)) {
        return val.map(filterEmpty).filter(isNonempty);
    }
    if (underscore.isObject(val)) {
        return underscore.pick(underscore.mapObject(val, filterEmpty), isNonempty);
    }
    return val;
}

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
function setETag(request, response, revision, tid) {
    if (request && request.headers && request.headers['x-restbase-etag']) {
        response.set('etag', request.headers['x-restbase-etag']);
        return;
    }
    if (!tid) {
        tid = uuid.now().toString();
    }
    response.set('etag', '' + revision + '/' + tid);
}

module.exports = {
    filterEmpty: filterEmpty,
    defaultVal: defaultVal,
    setETag: setETag
};
