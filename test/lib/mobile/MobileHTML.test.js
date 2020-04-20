'use strict';

const assert = require('assert');
const MobileHTML = require('../../../lib/mobile/MobileHTML');
const constants = require('../../../lib/mobile/MobileHTMLConstants');
const fixtures = require('../../utils/fixtures');
const perf = require('../../utils/performance');
const Reference = require('../../../lib/mobile/Reference');

describe('lib:MobileHTML', () => {
      it('does not block the event loop', () => {
        const doc = fixtures.readIntoDocument('United_States.html');
        const mobileHTMLPromise = MobileHTML.promise(doc);
        return perf.measure(mobileHTMLPromise, 1000).then(mobileHTML => {
          assert.equal(mobileHTML.doc.querySelector('section[data-mw-section-id="1"]').firstChild.outerHTML, '<div class="pcs-edit-section-header v2"><h2 id="Etymology" class="pcs-edit-section-title">Etymology</h2><span class="pcs-edit-section-link-container"><a href="/w/index.php?title=United_States&amp;action=edit&amp;section=1" data-id="1" data-action="edit_section" aria-labelledby="pcs-edit-section-aria-normal" class="pcs-edit-section-link"></a></span></div>');
        });
      });
      it('detects mwids', () => {
        assert(constants.mwidRegex.test('mwlA'));
        assert(!constants.mwidRegex.test('mwlAlA'));
        assert(!constants.mwidRegex.test('mw  '));
        assert(constants.mwidRegex.test('mwABC'));
        assert(constants.mwidRegex.test('mw123'));
        assert(!constants.mwidRegex.test(' mw123'));
        assert(!constants.mwidRegex.test('mw12 '));
      });
      it('detects https', () => {
        assert(constants.httpsRegex.test('https://'));
        assert(!constants.httpsRegex.test('nothttps://'), 'String needs to begin with https');
        assert(!constants.httpsRegex.test('http://'));
      });
      it('detects header tags', () => {
        assert(constants.headerTagRegex.test('H1'));
        assert(!constants.headerTagRegex.test('h1'), 'Lowercase not supported');
        assert(constants.headerTagRegex.test('H7'));
        assert(!constants.headerTagRegex.test('H9A'), 'String must only contain header tag name');
      });
      it('detects single bracket spans', () => {
        assert(constants.bracketSpanRegex.test('['));
        assert(constants.bracketSpanRegex.test(']'));
        assert(!constants.bracketSpanRegex.test(']]'));
        assert(!constants.bracketSpanRegex.test('[]'));
        assert(!constants.bracketSpanRegex.test('a'));
      });
      it('detects inline background styles', () => {
        assert(constants.inlineBackgroundStyleRegex.test('width: 100px; background: #fff; height:50px;'));
        assert(constants.inlineBackgroundStyleRegex.test('background-color: transparent; height:50px;'));
        assert(constants.inlineBackgroundStyleRegex.test('background-color: blue'));
        assert(constants.inlineBackgroundStyleRegex.test('background-color: unset'));
        assert(constants.inlineBackgroundStyleRegex.test('width: 50px; background-color: #3366ff'));
        assert(!constants.inlineBackgroundStyleRegex.test('width: 100px; height:50px;'));
        assert(!constants.inlineBackgroundStyleRegex.test('color: #3366ff; height:50px;'));
        assert(!constants.inlineBackgroundStyleRegex.test('color: inherit'));
      });
      it('detects infobox classes', () => {
        assert(constants.infoboxClassRegex.test('pcs-class infobox'));
        assert(constants.infoboxClassRegex.test('some-class infobox another-class'));
        assert(constants.infoboxClassRegex.test('infobox_v3'));
      });
      it('detects infobox exclusion classes', () => {
        assert(constants.infoboxClassExclusionRegex.test('infobox metadata'));
        assert(constants.infoboxClassExclusionRegex.test('mbox-small infobox'));
        assert(constants.infoboxClassExclusionRegex.test('metadata'));
      });
      it('detects new class', () => {
        assert(constants.newClassRegex.test('infobox new'));
        assert(constants.newClassRegex.test('new infobox'));
        assert(constants.newClassRegex.test('new'));
      });
      it('detects images to exclude from widening class', () => {
        assert(constants.widenImageExclusionClassRegex.test('infobox tsingle'));
        assert(constants.widenImageExclusionClassRegex.test('noresize infobox'));
        assert(constants.widenImageExclusionClassRegex.test('noviewer'));
      });
      it('detects reference text', () => {
        assert(constants.referenceClassRegex.test('infobox mw-reference-text'));
        assert(constants.referenceClassRegex.test('mw-reference-text infobox'));
        assert(constants.referenceClassRegex.test('mw-reference-text'));
        assert(constants.referenceClassRegex.test('reference-text'));
        assert(!constants.referenceClassRegex.test('someother-reference-text'));
        assert(!constants.referenceClassRegex.test('mw-linkback-text'));
      });
      it('detects forbidden element classes', () => {
        assert(constants.forbiddenElementClassRegex.test('infobox geo-nondefault'));
        assert(constants.forbiddenElementClassRegex.test('geo-multi-punct infobox'));
        assert(constants.forbiddenElementClassRegex.test('hide-when-compact'));
        assert(!constants.forbiddenElementClassRegex.test('hides-when-compact'));
      });
      it('detects forbidden element class substrings', () => {
        assert(constants.forbiddenElementClassSubstringRegex.test('infobox nomobilesok ok'));
        assert(constants.forbiddenElementClassSubstringRegex.test('navboxer infobox'));
        assert(constants.forbiddenElementClassSubstringRegex.test('nomobile'));
        assert(!constants.forbiddenElementClassSubstringRegex.test('infobox'));
      });
      it('detects forbidden div classes', () => {
        assert(constants.forbiddenDivClassRegex.test('infobox Z3988 ok'));
        assert(constants.forbiddenDivClassRegex.test('Z3988 infobox'));
        assert(constants.forbiddenDivClassRegex.test('magnify'));
        assert(!constants.forbiddenDivClassRegex.test('someclass notmagnify'));
      });
      it('detects forbidden span classes', () => {
        assert(constants.forbiddenSpanClassRegex.test('infobox Z3988 ok'));
        assert(constants.forbiddenSpanClassRegex.test('Z3988 infobox'));
        assert(constants.forbiddenSpanClassRegex.test('Z3988'));
        assert(!constants.forbiddenSpanClassRegex.test('someclass notZ3988'));
      });
      it('detects forbidden element ids', () => {
        assert(constants.forbiddenElementIDRegex.test('coordinates'));
        assert(!constants.forbiddenElementIDRegex.test('notcoordinates'));
        assert(!constants.forbiddenElementIDRegex.test('COORDINATES'));
      });
      it('was worth it to write these regexes', () => {
        const doc = fixtures.readIntoDocument('United_States.html');
        const element = doc.getElementById('mwFA');

        let start = perf.start();
        const cls = element.getAttribute('class');
        const trials = 1000;
        for (let i = 0; i < trials; i++) {
          constants.infoboxClassRegex.test(cls);
          constants.infoboxClassExclusionRegex.test(cls);
        }
        const regexNS = perf.finish(start);

        start = perf.start();
        for (let i = 0; i < trials; i++) {
          element.classList.contains('infobox');
          element.classList.contains('infoxbox_v3');
          element.classList.contains('metadata');
          element.classList.contains('mbox-small');
        }
        const containsNS = perf.finish(start);

        assert(regexNS < containsNS, 'Infobox regexes should be faster than classList.contains');
      });
      it('truncates reference links properly', () => {
        assert.strictEqual(Reference.truncateLinkText('[notes 1]'), '[N 1]');
        assert.strictEqual(Reference.truncateLinkText('[notes 101]'), '[N ..1]');
        assert.strictEqual(Reference.truncateLinkText('[1029]'), '[..29]');
        assert.strictEqual(Reference.truncateLinkText('[999]'), '[999]');
        assert.strictEqual(Reference.truncateLinkText('[1001]'), '[..01]');
        assert.strictEqual(Reference.truncateLinkText('[10001]'), '[...01]');
      });
});
