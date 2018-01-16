'use strict';

const assert = require('../../utils/assert.js');
const unit = require('../../../lib/summary').testing;
const domino = require('domino');

describe('lib:summary', () => {
    describe('buildExtracts', () => {
        it('Applies ', () => {
            const doc = domino.createDocument(`<p><span>
                <span id="coordinates"><a>Hello</a></span></span></p><p>2</p>`);
            const extract = unit.buildExtracts(doc, false);
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
            assert.deepEqual(unit.getSummaryType({}), 'standard');
        });
    });
});
