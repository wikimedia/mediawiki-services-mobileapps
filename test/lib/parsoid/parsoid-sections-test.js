'use strict';

const assert = require('../../utils/assert.js');
const domino = require('domino');
const parsoid = require('../../../lib/parsoidSections');

describe('lib:parsoid-sections', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    it('hasParsoidSections(empty) should return false', () => {
        const doc = domino.createDocument('');
        assert.ok(parsoid.hasParsoidSections(doc) === false);
    });

    it('hasParsoidSections(section) should return false', () => {
        const doc = domino.createDocument('<section></section>');
        assert.ok(parsoid.hasParsoidSections(doc) === false);
    });

    it('hasParsoidSections(section[data-mw-section-id]) should return true', () => {
        const doc = domino.createDocument('<section data-mw-section-id="0"></section>');
        assert.ok(parsoid.hasParsoidSections(doc) === true);
    });
});
