'use strict';

const assert = require('../../../utils/assert');
const hideRedLinks = require('../../../../lib/transforms').pcsHideRedLinks;
const fixtures = require('../../../utils/fixtures');

describe('lib:pcsHideRedLinks', () => {
    it('hideRedLinks should drop <a> elements with class="new" ', () => {
        const document = fixtures.readIntoDocument('Dog.html');
        assert.selectorExistsNTimes(document, 'a.new', 1, 'pre transform');

        hideRedLinks(document);

        assert.selectorExistsNTimes(document, 'a.new', 0,
            'post transform');
    });
});
