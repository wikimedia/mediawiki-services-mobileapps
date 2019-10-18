'use strict';

const assert = require('../../../utils/assert.js');
const widenImages = require('../../../../lib/transforms').widenImages;
const fixtures = require('../../../utils/fixtures');

describe('lib:widenImages', () => {
    it('widenImages should add a pagelib class to the appropriate figures ', () => {
        const document = fixtures.readIntoDocument('Dog.html');
        assert.selectorExistsNTimes(document, '.pagelib_widen_image_override', 0, 'pre transform');
        widenImages(document);
        assert.selectorExistsNTimes(document, '.pagelib_widen_image_override', 20,
            'post transform');
    });
});
