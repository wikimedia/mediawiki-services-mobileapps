'use strict';

const assert = require('../../utils/assert.js');
const domino = require('domino');
const transforms = require('../../../lib/transforms');

describe('lib:transforms', () => {
    it('rmBracketSpans should remove the spans around brackets', () => {
        const doc = domino.createDocument('<body><a><span>[</span>1<span>]</span></a></body>');
        assert.selectorExistsNTimes(doc, 'body span', 2);
        transforms._rmBracketSpans(doc);
        assert.selectorExistsNTimes(doc, 'body span', 0);
    });

    it('rmElementsWithSelectors should remove the spans with display:none', () => {
        const doc = domino.createDocument('<body><span style="display:none">foo</span></body>');
        assert.selectorExistsNTimes(doc, 'body span', 1);
        transforms._rmElementsWithSelectors(doc, [
            'span[style="display:none"]', // Remove <span style=\"display:none;\">&nbsp;</span>
            'span[style*=none]'             // Remove <span style=\"display:none;\">&nbsp;</span>
        ]);
        assert.selectorExistsNTimes(doc, 'body span', 0);
    });
});
