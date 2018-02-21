'use strict';

const assert = require('../../utils/assert');
const buildTOC = require('../../../lib/metadata').testing.buildTableOfContents;

const siteinfo = { general: { toctitle: "Contents" } };

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
    { id: 10, toclevel: 10, line: "Foo", anchor: "Foo" },
    { id: 11, toclevel: 11, line: "Foo", anchor: "Foo" }
];

describe('lib:metadata', () => {
    it('should exclude lead section and non-displayable or pseudo-sections', () => {
        const result = buildTOC(sections, siteinfo);
        assert.deepEqual(result.entries.length, 7, 'result should have 7 entries (3 excluded)');
    });

    it('should exclude lead section and sections with toclevel > 10', () => {
        const result = buildTOC(deepSections, siteinfo);
        assert.deepEqual(result.entries.length, 10, 'result should have 10 entries (2 excluded)');
    });

    it('toc numbers should reflect the toc level hierarchy', () => {
        const expected = ['1', '1.1', '1.1.1', '1.2', '1.2.1', '1.3', '2'];
        const result = buildTOC(sections, siteinfo).entries.map(i => i.tocnumber);
        assert.deepEqual(result.length, expected.length);
        for (let i = 0; i < expected.length; i++) {
            assert.deepEqual(result[i], expected[i]);
        }
    });
});
