'use strict';

var sUtil = require('../lib/util');

var monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

/**
 * Returns a String formatted in English date format.
 *
 * Example: "May 16, 2016"
 *
 * @param {Date} date date to be used
 * @return {String} formatted date string
 */
function formatDateEnglish(date) {
    var year = date.getUTCFullYear().toString();
    var month = monthNames[date.getUTCMonth()];
    var day  = date.getUTCDate().toString();
    return `${month} ${day}, ${year}`;
}

/**
 * Returns a Date object with the desired date as specified in the request.
 * The expected format is "yyyy/mm/dd".
 *
 * Example: "2016/05/11"
 *
 * @param {Object} req Object (looking for params property with subproperties yyyy, mm, dd.
 * @return {Date} date object
 */
function getRequestedDate(req) {
    return new Date(Date.UTC(req.params.yyyy, req.params.mm - 1, req.params.dd)); // month is 0-based
}

module.exports = {
    formatDateEnglish: formatDateEnglish,
    getRequestedDate: getRequestedDate
};
