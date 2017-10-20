'use strict';

const assert = require('../../utils/assert');
const sort = require('../../../lib/gallery').sort;

const siteInfo = require('../../fixtures/siteinfo_enwiki.json');
const page = '<html><img resource="./File:Foo.jpg"/><video resource="./File:Bar.ogv"/></html>';
const unsorted = {
    items: [
        { title: "File:Bar.ogv" },
        { title: "File:Foo.jpg" }
    ]
};
const sorted = {
    items: [
        { title: "File:Foo.jpg" },
        { title: "File:Bar.ogv" }
    ]
};

describe('lib:media', () => {

    it('Results should be sorted in order of appearance on the page', () => {
        const result = unsorted;
        sort(page, result, siteInfo);
        assert.deepEqual(result, sorted);
    });

});
