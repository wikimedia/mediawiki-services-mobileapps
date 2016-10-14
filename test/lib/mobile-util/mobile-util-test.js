'use strict';

var assert = require('../../utils/assert');
var mUtil = require('../../../lib/mobile-util');
var preq  = require('preq');

var obj1 = { hello: true, world: true };
var obj2 = { goodbye: true, sea: true, again: false };
var obj3 = { hello: true, world: true, again: false };
var obj4 = { goodbye: true, sea: true };
var obj5 = { goodbye: true, sea: true, world: true, again: true };
var obj6 = { goodbye: true, sea: true, again: true };

var arr1 = [ obj1, obj3 ];
var arr2 = [ obj4, obj6 ];
var arr3 = [ obj4, obj5 ];
var arr4 = [ obj5, obj5 ];
var arr5 = [ obj1, obj3, obj6 ];
var arr6 = [ obj1, obj3 ];
var arr7 = [ obj4, obj2 ];

describe('lib:mobile-util', function() {
    this.timeout(20000);

    it('removeTLD should remove TLD', function() {
        assert.deepEqual(mUtil.removeTLD('ru.wikipedia.org'), 'ru.wikipedia');
    });

    it('mergeByProp should merge two objects by shared property', function() {
        mUtil.mergeByProp(arr1, arr2, 'again', true)
        assert.deepEqual(arr1, arr5);
    });

    it('adjustMemberKeys should make the specified adjustments', function() {
        mUtil.adjustMemberKeys(arr6, ['goodbye', 'hello'], ['sea', 'world']);
        assert.deepEqual(arr6, arr7);

        mUtil.adjustMemberKeys(arr3, ['goodbye', 'hello'], ['sea', 'world']);
        assert.deepEqual(arr3, arr2);
    });

    it('fillInMemberKeys should make the specified adjustments', function() {
        mUtil.fillInMemberKeys(arr3, ['world', 'goodbye'], ['again', 'sea']);
        assert.deepEqual(arr3, arr4);
    });
});
