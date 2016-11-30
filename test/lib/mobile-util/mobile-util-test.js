/* eslint-env mocha */

'use strict';

const assert = require('../../utils/assert');
const mUtil = require('../../../lib/mobile-util');

const obj1 = { hello: true, world: true };
const obj2 = { goodbye: true, sea: true, again: false };
const obj3 = { hello: true, world: true, again: false };
const obj4 = { goodbye: true, sea: true };
const obj5 = { goodbye: true, sea: true, world: true, again: true };
const obj6 = { goodbye: true, sea: true, again: true };

const arr1 = [ obj1, obj3 ];
const arr2 = [ obj4, obj6 ];
const arr3 = [ obj4, obj5 ];
const arr4 = [ obj5, obj5 ];
const arr5 = [ obj1, obj3, obj6 ];
const arr6 = [ obj1, obj3 ];
const arr7 = [ obj4, obj2 ];

describe('lib:mobile-util', () => {
    it('removeTLD should remove TLD', () => {
        assert.deepEqual(mUtil.removeTLD('ru.wikipedia.org'), 'ru.wikipedia');
    });

    it('mergeByProp should merge two objects by shared property', () => {
        mUtil.mergeByProp(arr1, arr2, 'again', true);
        assert.deepEqual(arr1, arr5);
    });

    it('adjustMemberKeys should make the specified adjustments', () => {
        mUtil.adjustMemberKeys(arr6, ['goodbye', 'hello'], ['sea', 'world']);
        assert.deepEqual(arr6, arr7);

        mUtil.adjustMemberKeys(arr3, ['goodbye', 'hello'], ['sea', 'world']);
        assert.deepEqual(arr3, arr2);
    });

    it('fillInMemberKeys should make the specified adjustments', () => {
        mUtil.fillInMemberKeys(arr3, ['world', 'goodbye'], ['again', 'sea']);
        assert.deepEqual(arr3, arr4);
    });
});
