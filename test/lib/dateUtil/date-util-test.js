'use strict';

const assert = require('../../utils/assert.js');
const dateUtil = require('../../../lib/dateUtil');

describe('lib:dateUtil', () => {
    it('getRequestedDate(2016-04-15) should return a valid Date object', () => {
        const actual = dateUtil.getRequestedDate({
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

    it('iso8601DateFromYYYYMMDD', () => {
        const date = '1999123112';
        const expected = '1999-12-31Z';
        assert.deepEqual(dateUtil.iso8601DateFromYYYYMMDD(date), expected);
    });

    it('addDays positive', () => {
        const date = new Date('1999-12-31');
        const expected = new Date('2000-01-01');
        assert.deepEqual(dateUtil.addDays(date, 1), expected);
    });

    it('addDays zero', () => {
        const date = new Date('2000-01-01');
        const expected = new Date(date);
        assert.deepEqual(dateUtil.addDays(date, 0), expected);
    });

    it('addDays negative', () => {
        const date = new Date('2000-01-01');
        const expected = new Date('1999-12-31');
        assert.deepEqual(dateUtil.addDays(date, -1), expected);
    });

    it('addDays immutable', () => {
        const date = new Date('2000-01-01');
        const expected = new Date(date);
        dateUtil.addDays(date, 1);
        assert.deepEqual(date, expected);
    });

    it('formatYYYYMMDD', () => {
        const date = new Date('2000-01-01');
        const expected = '20000101';
        assert.deepEqual(dateUtil.formatYYYYMMDD(date), expected);
    });

    it('isWithinLast3Days', () => {
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = now.getUTCMonth();
        const day = now.getUTCDate();
        assert.deepEqual(
            dateUtil.isWithinLast3Days(new Date(Date.UTC(year, month, day - 4))), false);
        assert.deepEqual(
            dateUtil.isWithinLast3Days(new Date(Date.UTC(year, month, day - 3))), true);
        assert.deepEqual(
            dateUtil.isWithinLast3Days(new Date(Date.UTC(year, month, day - 2))), true);
        assert.deepEqual(
            dateUtil.isWithinLast3Days(new Date(Date.UTC(year, month, day - 1))), true);
        assert.deepEqual(
            dateUtil.isWithinLast3Days(new Date(Date.UTC(year, month, day))), true);
        assert.deepEqual(
            dateUtil.isWithinLast3Days(new Date(Date.UTC(year, month, day + 1))), false);
    });

    it('date format validation should reject invalid formats', () => {
        assert.ok(!dateUtil.validate('2016-7-4'));
        assert.ok(!dateUtil.validate('2016-07-4'));
        assert.ok(!dateUtil.validate('2016-7-04'));
        assert.ok(!dateUtil.validate('00000002016-07-04'));
        assert.ok(!dateUtil.validate('2016-000000007-04'));
        assert.ok(!dateUtil.validate('2016-07-000000004'));
        assert.ok(!dateUtil.validate('2039-07-04'));
        assert.ok(!dateUtil.validate('2016-13-04'));
        assert.ok(!dateUtil.validate('2016-07-34'));
        assert.ok(!dateUtil.validate('0000-07-04'));
        assert.ok(!dateUtil.validate('2016-00-04'));
        assert.ok(!dateUtil.validate('2016-07-00'));
        assert.ok(!dateUtil.validate('abcd-07-04'));
        assert.ok(!dateUtil.validate('2016-ef-04'));
        assert.ok(!dateUtil.validate('2016-07-gh'));
        assert.ok(!dateUtil.validate('*!@#-07-04'));
        assert.ok(!dateUtil.validate('2016-*!-04'));
        assert.ok(!dateUtil.validate('2016-07-@#'));
        assert.ok(!dateUtil.validate('\u00002016-07-04'));
        assert.ok(!dateUtil.validate('2016-\u000007-04'));
        assert.ok(!dateUtil.validate('2016-07-\u000004'));
        assert.ok(dateUtil.validate('2016-07-04'));
    });
});
