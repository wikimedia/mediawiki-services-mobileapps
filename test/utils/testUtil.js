'use strict';

const dateUtil = require('../../lib/dateUtil');
const Template = require('swagger-router').Template;
const fixtures = require('./fixtures');

const testUtil = {};

/**
 * Construct a date string from a Date object.  Used for testing.
 * Example: "2016/05/16"
 * @param {!Date} dateObj date to be used
 * @return {!string} formatted date string
 */
testUtil.constructTestDate = function(dateObj) {
    return `${dateObj.getUTCFullYear()}/${
        dateUtil.pad(dateObj.getUTCMonth() + 1)}/${
        dateUtil.pad(dateObj.getUTCDate())}`;
};

testUtil.rbTemplate = new Template({
    method: '{{request.method}}',
    uri: 'https://{{domain}}/api/rest_v1/{+path}',
    query: '{{ default(request.query, {}) }}',
    headers: '{{request.headers}}',
    body: '{{request.body}}'
});

/**
 * @param {!string} fileName name of the fixture file to load
 * @return {!Document}
 */
testUtil.readTestFixtureDoc = fixtures.readIntoDocument;

module.exports = testUtil;
