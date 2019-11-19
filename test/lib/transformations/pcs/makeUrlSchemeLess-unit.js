'use strict';

const assert = require('../../../utils/assert.js');
const addPageHeader = require('../../../../lib/transformations/pcs/addPageHeader');
const makeUrlSchemeless = require('../../../../lib/transformations/pcs/makeUrlSchemeless');
const testUtil = require('../../../utils/testUtil');

describe('lib:makeUrlSchemeless', () => {
    it('makeUrlSchemeless should remove all https links from page', () => {
        const document = testUtil.readTestFixtureDoc('urlSchemeLessTest.html');
        const tags = {
            a: 'href',
            link: 'href',
            script: 'src',
            source: 'src',
        };

        Object.keys(tags).forEach((selector) => {
            makeUrlSchemeless(document, selector, tags[selector]);
            assert.attributeNotContainsValue(document, selector, tags[selector], 'https');
        });
    });
});
