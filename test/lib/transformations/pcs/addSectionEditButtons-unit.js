'use strict';

const domino = require('domino');
const fs = require('fs');
const path = require('path');
const assert = require('../../../utils/assert.js');
const lib = require('../../../../lib/transformations/pcs/addSectionEditButtons');
const FIXTURES = 'test/fixtures/';
describe('lib:addSectionEditButtons', () => {
    /**
     * @param {!string} fileName name of the fixture file to load
     * @return {!Document}
     */
    const readTestDoc = (fileName) => {
        const html = fs.readFileSync(path.resolve(FIXTURES, fileName));
        return domino.createDocument(html);
    };

    it('addSectionEditButtons should restructure section headings', () => {
        const document = readTestDoc('Dog.html');
        assert.selectorExistsNTimes(document, '.pagelib_edit_section_header', 0, 'pre transform');
        assert.selectorExistsNTimes(document, '.pagelib_edit_section_link_container', 0, 'pre 2');
        assert.selectorExistsNTimes(document, '.pagelib_edit_section_link', 0, 'pre tx 3');

        lib.addSectionEditButtons(document, 'Dog');

        assert.selectorExistsNTimes(document, '.pagelib_edit_section_header', 46, 'post transform');
        assert.selectorExistsNTimes(document, '.pagelib_edit_section_link_container', 47, 'post 2');
        assert.selectorExistsNTimes(document, '.pagelib_edit_section_link', 47, 'post tx 3');
        assert.deepEqual(document.querySelector('.pagelib_edit_section_link').href,
            '/w/index.php?title=Dog&action=edit&section=0', 'post tx 4: first edit link');
    });

    it('isRTL should return false for LTR doc', () => {
        const document = readTestDoc('Dog.html');
        const firstSectionElement = document.querySelector('section');
        assert.ok(!lib.isRTL(firstSectionElement));
    });

    it('isRTL should return true for RTL .doc', () => {
        const document = readTestDoc('ar-Mathematics.html');
        const firstSectionElement = document.querySelector('section');
        assert.ok(lib.isRTL(firstSectionElement));
    });
});
