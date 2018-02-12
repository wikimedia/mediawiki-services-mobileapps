'use strict';

const assert = require('../../utils/assert.js');
const unit = require('../../../lib/summary').testing;
const domino = require('domino');

describe('lib:summary', () => {
    describe('buildExtracts', () => {
        it('Applies stripUnneededMarkup', () => {
            const doc = domino.createDocument(`<p><span>
                <span id="coordinates"><a>Hello</a></span></span></p><p>2</p>`);
            const extract = unit.buildExtracts(doc, { ns: 0, contentmodel: 'wikitext' });
            assert.deepEqual(extract.extract_html, '<p>2</p>', 'Unneeded markup is stripped.');
        });
    });
    describe('getSummaryType', () => {
        it('identifies main page', () => {
            assert.deepEqual(unit.getSummaryType({ "mainpage": true }), 'mainpage');
        });
        it('identifies disambig page', () => {
            assert.deepEqual(unit.getSummaryType({ "pageprops": { "disambiguation": "" } }),
                'disambiguation');
        });
        it('defaults to "standard"', () => {
            assert.deepEqual(unit.getSummaryType({ ns: 0, contentmodel: 'wikitext' }), 'standard');
        });
        it('type for ns > 0 is no-extract', () => {
            assert.deepEqual(unit.getSummaryType({ ns: 1, contentmodel: 'wikitext' }), 'no-extract'); // eslint-disable-line max-len
        });
        it('type for non-wikitext content model is no-extract', () => {
            assert.deepEqual(unit.getSummaryType({ ns: 0, contentmodel: 'binary' }), 'no-extract');
        });
        it('type for redirect is no-extract', () => {
            assert.deepEqual(unit.getSummaryType({ ns: 0, contentmodel: 'wikitext', redirect: true }), 'no-extract'); // eslint-disable-line max-len
        });
    });
});
