'use strict';

const domino = require('domino');
const fs = require('fs');
const path = require('path');
const assert = require('../../../utils/assert.js');
const prepForTheme = require('../../../../lib/transformations/pcs/prepForTheme');

const FIXTURES = 'test/fixtures/';

describe('lib:prepForTheme', () => {

    /**
     * @param {!string} fileName name of the fixture file to load
     * @return {!Document}
     */
    const readTestDoc = (fileName) => {
        const html = fs.readFileSync(path.resolve(FIXTURES, fileName));
        return domino.createDocument(html);
    };

    it('prepForTheme should add a pagelib class to the appropriate figures ', () => {
        const document = readTestDoc('Dog.html');
        assert.selectorExistsNTimes(document, '.pagelib_theme_image_presumes_white_background', 0,
            'pre transform');
        prepForTheme(document);
        assert.selectorExistsNTimes(document, '.pagelib_theme_image_presumes_white_background', 43,
            'post transform');
    });
});
