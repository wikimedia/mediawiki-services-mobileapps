'use strict';

const domino = require('domino');
const assert = require('../../utils/assert');
const getTocLimit = require('../../../lib/metadata').testing.getTocLimit;
const getTocFlags = require('../../../lib/metadata').testing.getTocFlags;
const buildTocEntries = require('../../../lib/metadata').testing.buildTocEntries;

const sections = [
    { id: 0 },
    { id: 1, toclevel: 1, line: "Foo", anchor: "Foo" },
    { id: 2, toclevel: 2, line: "Foo", anchor: "Foo" },
    { id: -1 },
    { id: 3, toclevel: 3, line: "Foo", anchor: "Foo" },
    { id: 4, toclevel: 2, line: "Foo", anchor: "Foo" },
    { id: -2 },
    { id: 5, toclevel: 3, line: "Foo", anchor: "Foo" },
    { id: 6, toclevel: 2, line: "Foo", anchor: "Foo" },
    { id: 7, toclevel: 1, line: "Foo", anchor: "Foo" }
];

const deepSections = [
    { id: 0 },
    { id: 1, toclevel: 1, line: "Foo", anchor: "Foo" },
    { id: 2, toclevel: 2, line: "Foo", anchor: "Foo" },
    { id: 3, toclevel: 3, line: "Foo", anchor: "Foo" },
    { id: 4, toclevel: 4, line: "Foo", anchor: "Foo" },
    { id: 5, toclevel: 5, line: "Foo", anchor: "Foo" },
    { id: 6, toclevel: 6, line: "Foo", anchor: "Foo" },
    { id: 7, toclevel: 7, line: "Foo", anchor: "Foo" },
    { id: 8, toclevel: 8, line: "Foo", anchor: "Foo" },
    { id: 9, toclevel: 9, line: "Foo", anchor: "Foo" },
    { id: 10, toclevel: 10, line: "Foo", anchor: "Foo" }
];

function getTocLimitDoc(classList) {
    return domino.createDocument(`<div class="${classList.join(' ')}"></div>`);
}

function assertDeepSectionsTocLimit(lim, length, last) {
    const flags = getTocFlags(getTocLimitDoc([ `toclimit-${lim}` ]), { pageprops: {} });
    const result = buildTocEntries(deepSections, flags);
    assert.deepEqual(result.length, length);
    assert.deepEqual(result[length - 1].tocnumber, last);
}

describe('lib:metadata', () => {
    it('should exclude lead section and non-displayable or pseudo-sections', () => {
        const result = buildTocEntries(sections, {});
        assert.deepEqual(result.length, 7, 'result should have 7 entries (3 excluded)');
    });

    it('should exclude lead section and (by default) sections with toclevel >= 10', () => {
        const result = buildTocEntries(deepSections, {});
        assert.deepEqual(result.length, 9, 'result should have 9 entries (2 excluded)');
    });

    it('toc numbers should reflect the toc level hierarchy', () => {
        const expected = ['1', '1.1', '1.1.1', '1.2', '1.2.1', '1.3', '2'];
        const result = buildTocEntries(sections, {}).map(i => i.tocnumber);
        assert.deepEqual(result.length, expected.length);
        for (let i = 0; i < expected.length; i++) {
            assert.deepEqual(result[i], expected[i]);
        }
    });

    it('toclimit div limits TOC depth', () => {
        assertDeepSectionsTocLimit(2, 1, '1');
        assertDeepSectionsTocLimit(3, 2, '1.1');
        assertDeepSectionsTocLimit(4, 3, '1.1.1');
        assertDeepSectionsTocLimit(5, 4, '1.1.1.1');
        assertDeepSectionsTocLimit(6, 5, '1.1.1.1.1');
    });

    it('getTocFlags gets notoc pageprop when present', () => {
        const html = '<meta property="mw:PageProp/notoc">';
        const result = getTocFlags(domino.createDocument(html));
        assert.deepEqual(result, { notoc: true });
    });

    it('getTocFlags gets forcetoc pageprop when present', () => {
        const html = '<meta property="mw:PageProp/forcetoc">';
        const result = getTocFlags(domino.createDocument(html));
        assert.deepEqual(result, { forcetoc: true });
    });

    it('forcetoc overrides notoc', () => {
        const html = `<meta property="mw:PageProp/notoc"><meta property="mw:PageProp/forcetoc">`;
        const result = getTocFlags(domino.createDocument(html));
        assert.deepEqual(result, { forcetoc: true });
    });

    it('no toclimit if notoc=true', () => {
        const html = `<meta property="mw:PageProp/notoc"><div class="toclimit-5"></div>`;
        const result = getTocFlags(domino.createDocument(html));
        assert.deepEqual(result, { notoc: true });
    });

    it('toclimit is present if notoc is overridden by forcetoc', () => {
        const html = `<meta property="mw:PageProp/notoc"><meta property="mw:PageProp/forcetoc">
            <div class="toclimit-5"></div>`;
        const result = getTocFlags(domino.createDocument(html));
        assert.deepEqual(result, { forcetoc: true, toclimit: 5 });
    });

    it('getTocLimit handles multi-digit toclimit values', () => {
        const result = getTocLimit(getTocLimitDoc([ 'toclimit-10' ]));
        const result2 = getTocLimit(getTocLimitDoc([ 'toclimit-100' ]));
        assert.deepEqual(result, 10);
        assert.deepEqual(result2, 100);
    });

    it('getTocLimit handles other classes in the toclimit div\'s classlist', () => {
        const result = getTocLimit(getTocLimitDoc([ 'foo', 'toclimit-10', 'bar' ]));
        assert.deepEqual(result, 10);
    });
});
