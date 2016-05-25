'use strict';

var assert = require('../../utils/assert.js');
var dateUtil = require('../../../lib/dateUtil');

describe('lib:dateUtil', function() {
    this.timeout(20000);

    it('getRequestedDate(2016/04/15) should return a valid Date object', function() {
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
});
