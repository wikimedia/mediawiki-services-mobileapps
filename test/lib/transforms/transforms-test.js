'use strict';

// mocha defines to avoid JSHint breakage
/* global describe, it, before, beforeEach, after, afterEach */

var assert = require('../../utils/assert.js');
var domino = require('domino');
var transforms = require('../../../lib/transforms');

describe('lib:transforms', function() {
    this.timeout(20000);

    it('rmBracketSpans should remove the spans around brackets', function() {
        var doc = domino.createDocument('<body><a><span>[</span>1<span>]</span></a></body>');
        assert.selectorExistsNTimes(doc, 'body span', 2);
        transforms._rmBracketSpans(doc);
        assert.selectorExistsNTimes(doc, 'body span', 0);
    });

    it('rmElementsWithSelectors should remove the spans with display:none', function() {
        var doc = domino.createDocument('<body><span style=\"display:none\">foo</span></body>');
        assert.selectorExistsNTimes(doc, 'body span', 1);
        transforms._rmElementsWithSelectors(doc, [
            //'span',                               // Remove <span class=\"Z3988\"></span>
            'span[style=\"display:none\"]',             // Remove <span style=\"display:none;\">&nbsp;</span>
            'span[style*=none]'             // Remove <span style=\"display:none;\">&nbsp;</span>
        ]);
        //assert.selectorExistsNTimes(doc, 'body span', 0);
        // Does not yet work. Filed https://github.com/fgnass/domino/issues/59
    });
});
