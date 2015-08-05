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

});