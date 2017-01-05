'use strict';

const sUtil = require('../lib/util');
const HTTPError = sUtil.HTTPError;

const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const dateUtil = {};

dateUtil.ONE_DAY = 86400000;

/**
 * Returns a String formatted in English date format.
 *
 * Example: "May 16, 2016"
 *
 * @param {!Date} date date to be used
 * @return {!String} formatted date string
 */
dateUtil.formatDateEnglish = function(date) {
    const year = date.getUTCFullYear().toString();
    const month = monthNames[date.getUTCMonth()];
    const day  = date.getUTCDate().toString();
    return `${month} ${day}, ${year}`;
};

/**
 * Returns a Date object with the desired date as specified in the request.
 * The expected format is "yyyy/mm/dd".
 *
 * Example: "2016/05/11"
 *
 * @param {!Object} req Object (looking for params property with subproperties yyyy, mm, dd.
 * @return {!Date} date object
 */
dateUtil.getRequestedDate = function(req) {
    return new Date(Date.UTC(req.params.yyyy, req.params.mm - 1, req.params.dd));
};

dateUtil.dateStringFrom = function(req) {
    return req.params.yyyy + req.params.mm + req.params.dd;
};

dateUtil.hyphenDelimitedDateString = function(req) {
    return `${req.params.yyyy}-${req.params.mm}-${req.params.dd}`;
};

dateUtil.iso8601DateFrom = function(req) {
    return `${req.params.yyyy}-${req.params.mm}-${req.params.dd}Z`;
};

/**
 * @param {!string} str e.g., 2016122800
 * @return {!string} e.g., 2016-12-28Z
 */
dateUtil.iso8601DateFromYYYYMMDD = function(str) {
    return str.replace(/(\d{4})(\d{2})(\d{2}).*/g, '$1-$2-$3Z');
};

dateUtil.pad = function(number) {
    if (number < 10) {
        return `0${number}`;
    }
    return number;
};

/**
 @param {!Date} date
 @param {!number} days
 */
dateUtil.addDays = (date, days) => {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
};

/**
 * Returns a String formatted in ISO date format -- just the date. Timezone is UTC.
 * This is similar to Date.toISOString() but without the time and time zone portions.
 *
 * Example: "2016-05-16"
 *
 * @param {!Date} date date to be used
 * @return {!String} formatted date string
 */
dateUtil.formatISODate = function(date) {
    return `${date.getUTCFullYear()
    }-${dateUtil.pad(date.getUTCMonth() + 1)
    }-${dateUtil.pad(date.getUTCDate())}`;
};

/**
 * @param {!Date} date
 * @return {!String} e.g., 20160516
 */
dateUtil.formatYYYYMMDD = (date) => {
    return dateUtil.formatISODate(date).replace(/-/g, '');
};

// Validate the input date by checking whether UTC-format constructed from the
// input components matches the values actually provided.
dateUtil.isValidDate = function(dateString, year, month, day) {
    return new Date(Date.UTC(year, month - 1, day)).toISOString().split('T').shift() === dateString;
};

// Check that @param year is in the interval (2001 <= year <= (current year + 1))
dateUtil.isWithinBounds = function(year) {
    return year >= 2016 && year <= new Date().getUTCFullYear() + 1;
};

dateUtil.throwDateError = function() {
    throw new HTTPError({
        status: 404,
        type: 'not_found',
        title: 'Not found.',
        detail: 'Invalid date provided.  Please request a valid date of format yyyy/mm/dd'
    });
};

// Validates that the input string is a valid date in the expected format
dateUtil.validate = function(dateString) {
    try {
        const parts = dateString.split("-");
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const day = parseInt(parts[2]);
        return dateUtil.isValidDate(dateString, year, month, day)
            && dateUtil.isWithinBounds(year);
    } catch (error) {
        return false;
    }
};

module.exports = dateUtil;
