'use strict';

const assert = require('../../utils/assert');
const mUtil = require('../../../lib/mobile-util');
const domino = require('domino');

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

const ordered = [
    { order: 1, join: 'foo' },
    { order: 2, join: 'bar' },
    { order: 3, join: 'baz' }
];

const unordered = [
    { join: 'bar', extra: 'doc' },
    { join: 'baz', extra: 'dickory' },
    { join: 'foo', extra: 'hickory' },
];

const combined = [
    { order: 1, join: 'foo', extra: 'hickory' },
    { order: 2, join: 'bar', extra: 'doc' },
    { order: 3, join: 'baz', extra: 'dickory' }
];

describe('lib:mobile-util', () => {
    it('removeTLD should remove TLD', () => {
        assert.deepEqual(mUtil.removeTLD('ru.wikipedia.org'), 'ru.wikipedia');
    });

    it('URL fragments should be stripped correctly', () => {
        assert.deepEqual(mUtil.removeFragment('100_metres_hurdles#Top_25_fastest_athletes'),
            '100_metres_hurdles');
        assert.deepEqual(mUtil.removeFragment('Kendra_Harrison'), 'Kendra_Harrison');
    });

    it('removeLinkPrefix should strip the ./ correctly', () => {
        assert.deepEqual(mUtil.removeLinkPrefix('./100_metres_hurdles#Top_25_fastest_athletes'),
            '100_metres_hurdles#Top_25_fastest_athletes');
        assert.deepEqual(mUtil.removeLinkPrefix('Kendra_Harrison'), 'Kendra_Harrison');
    });

    it('extractDbTitleFromAnchor should get the right parts of the href', () => {
        const linkHtml = `<html><head><base href="//en.wikipedia.org/wiki/"/></head></html><body>
<a href="./My_db_title">foo bar</a></body></html>`;
        const document = domino.createDocument(linkHtml);
        const link = document.querySelector('a');
        assert.deepEqual(mUtil.extractDbTitleFromAnchor(link), 'My_db_title');
    });

    it('mergeByProp should preserve order of arr1', () => {
        mUtil.mergeByProp(ordered, unordered, 'join', false);
        assert.deepEqual(ordered, combined);
    });

    it('mergeByProp should not add obj if no obj in arr1 exists w/ prop=value & push=false', () => {
        mUtil.mergeByProp(arr1, arr2, 'again', false);
        assert.deepEqual(arr1, arr6);
    });

    it('mergeByProp should add obj if no obj in arr1 exists w/ prop=value & push=true', () => {
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
