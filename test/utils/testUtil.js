'use strict';

const dateUtil = require('../../lib/dateUtil');

const testUtil = {};

/**
 * Construct a date string from a Date object.  Used for testing.
 * Example: "2016/05/16"
 * @param {!Date} dateObj date to be used
 * @return {!String} formatted date string
 */
testUtil.constructTestDate = function(dateObj) {
    return `${dateObj.getUTCFullYear()}/${
         dateUtil.pad(dateObj.getUTCMonth() + 1)}/${
         dateUtil.pad(dateObj.getUTCDate())}`;
};

module.exports = testUtil;
