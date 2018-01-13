'use strict';

const assert = require('../../utils/assert.js');
const unit = require('../../../lib/summary').testing;

describe('lib:summary', () => {
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
