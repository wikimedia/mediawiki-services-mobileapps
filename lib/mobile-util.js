'use strict';

var underscore = require('underscore');

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

module.exports = {
    filterEmpty: filterEmpty,
    defaultVal: defaultVal
};