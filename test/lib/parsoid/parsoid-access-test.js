'use strict';

// mocha defines to avoid JSHint breakage
/* global describe, it, before, beforeEach, after, afterEach */

var assert = require('../../utils/assert.js');
var domino = require('domino');
var parsoid = require('../../../lib/parsoid-access');

describe('lib:parsoid', function() {
    this.timeout(20000);

    function assertSection0(sections) {
        assert.deepEqual(sections[0].id, 0);
        assert.deepEqual(sections[0].text, 'text0', JSON.stringify(sections[0], null, 2));
    }

    function assertSection1(sections) {
        assert.deepEqual(sections[1].id, 1);
        assert.deepEqual(sections[1].toclevel, 1);
        assert.deepEqual(sections[1].line, 'foo');
        assert.deepEqual(sections[1].anchor, 'foo');
        assert.deepEqual(sections[1].text, 'text1');
    }

    function assertSection2(sections) {
        assert.deepEqual(sections[2].id, 2);
        assert.deepEqual(sections[2].toclevel, 2);
        //assert.deepEqual(sections[2].line, 'Funny section !@#$');
        assert.deepEqual(sections[2].anchor, 'Funny_section_.21.40.23.24');
        assert.deepEqual(sections[2].text, 'text2');
    }


    it('getSectionsText(empty) should produce an empty lead section', function() {
        var doc = domino.createDocument('<body></body>');
        parsoid._addSectionDivs(doc);
        var sections = parsoid._getSectionsText(doc);
        assert.deepEqual(sections.length, 1);
        assert.deepEqual(sections[0].id, 0);
        assert.deepEqual(sections[0].text, '');
    });

    it('getSectionsText() with just text should produce a lead section', function() {
        var doc = domino.createDocument('<body>text0</body>');
        parsoid._addSectionDivs(doc);
        var sections = parsoid._getSectionsText(doc);
        assert.deepEqual(sections.length, 1);
        assertSection0(sections);
    });

    it('getSectionsText() with one h2 should produce two sections', function() {
        var doc = domino.createDocument('<body>text0<h2>foo</h2>text1</body>');
        parsoid._addSectionDivs(doc);
        var sections = parsoid._getSectionsText(doc);
        assert.deepEqual(sections.length, 2);
        assertSection0(sections);
        assertSection1(sections);
    });

    it('getSectionsText() with one h2 and h3 should produce three sections', function() {
        var doc = domino.createDocument('<body>text0<h2>foo</h2>text1<h3 id="mwBa">Funny section !@#$%^&*()</h3>text2</body>');
        parsoid._addSectionDivs(doc);
        var sections = parsoid._getSectionsText(doc);
        assert.deepEqual(sections.length, 3);
        assertSection0(sections);
        assertSection1(sections);
        assertSection2(sections);
    });

    it('_hasRedirectInPayload() with redirect in body should return a redirect', function() {
        var body = '<body><link rel="mw:PageProp/redirect" href="./Redirected_page" id="mwAQ"/></body>';
        var redirect = parsoid._hasRedirectInPayload(body);
        assert.ok(redirect === true);
    });

    it('_hasRedirectInPayload() without redirect in body should not return a redirect', function() {
        var body = '<body>foo bar</body>';
        var redirect = parsoid._hasRedirectInPayload(body);
        assert.ok(redirect === false);
    });

    it('_getRedirectTitleFromLocationHeader() with redirect', function() {
        var response = {
            'status': 301,
            'headers': {
                'location': '//foo/bar/Redirected_page'
            }
        };
        var redirect = parsoid._getRedirectTitleFromLocationHeader(response);
        assert.deepEqual(redirect, 'Redirected_page');
    });
});
