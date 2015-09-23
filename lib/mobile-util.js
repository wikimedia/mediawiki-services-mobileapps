'use strict';

var underscore = require('underscore');
var uuid = require('cassandra-uuid').TimeUuid;

var isNonempty = underscore.negate(underscore.isEmpty);

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
 * Sets the ETag header on the response object comprised of the revision ID
 * and the time UUID. If the latter is not given, the current time stamp is
 * used to generate it.
 *
 * @param {Object}  response the HTTPResponse object on which to set the header
 * @param {integer} revision the revision ID to use
 * @param {string}  tid      the time UUID to use; optional
 */
function setETag(response, revision, tid) {
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
