'use strict';

var assert = require('../../utils/assert.js');
var dateUtil = require('../../../lib/dateUtil');
var HTTPError = require('../../../lib/util').HTTPError;

describe('lib:dateUtil', function() {
    this.timeout(20000);

    it('getRequestedDate(2016-04-15) should return a valid Date object', function() {
        var actual = dateUtil.getRequestedDate({
            params: {
                yyyy: 2016,
                mm: 4,
                dd: 15
            }
        });
        assert.equal(actual.getUTCFullYear(), 2016);
        assert.equal(actual.getUTCMonth(), 4 - 1);
        assert.equal(actual.getUTCDate(), 15);
    });

    it('date format validation should reject invalid formats', function() {
        assert.throws(function() { dateUtil.validate('2016-7-4'); }, HTTPError);
        assert.throws(function() { dateUtil.validate('2016-07-4'); }, HTTPError);
        assert.throws(function() { dateUtil.validate('2016-7-04'); }, HTTPError);
        assert.throws(function() { dateUtil.validate('00000002016-07-04'); }, HTTPError);
        assert.throws(function() { dateUtil.validate('2016-000000007-04'); }, HTTPError);
        assert.throws(function() { dateUtil.validate('2016-07-000000004'); }, HTTPError);
        assert.throws(function() { dateUtil.validate('2039-07-04'); }, HTTPError);
        assert.throws(function() { dateUtil.validate('2016-13-04'); }, HTTPError);
        assert.throws(function() { dateUtil.validate('2016-07-34'); }, HTTPError);
        assert.throws(function() { dateUtil.validate('0000-07-04'); }, HTTPError);
        assert.throws(function() { dateUtil.validate('2016-00-04'); }, HTTPError);
        assert.throws(function() { dateUtil.validate('2016-07-00'); }, HTTPError);
        assert.throws(function() { dateUtil.validate('abcd-07-04'); }, HTTPError);
        assert.throws(function() { dateUtil.validate('2016-ef-04'); }, HTTPError);
        assert.throws(function() { dateUtil.validate('2016-07-gh'); }, HTTPError);
        assert.throws(function() { dateUtil.validate('*!@#-07-04'); }, HTTPError);
        assert.throws(function() { dateUtil.validate('2016-*!-04'); }, HTTPError);
        assert.throws(function() { dateUtil.validate('2016-07-@#'); }, HTTPError);
        assert.throws(function() { dateUtil.validate('\u00002016-07-04'); }, HTTPError);
        assert.throws(function() { dateUtil.validate('2016-\u000007-04'); }, HTTPError);
        assert.throws(function() { dateUtil.validate('2016-07-\u000004'); }, HTTPError);
        assert.doesNotThrow(function() { dateUtil.validate('2016-07-04'); });
    })
});
