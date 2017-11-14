'use strict';

const assert = require('../../utils/assert');
const media = require('../../../lib/media');

const siteInfo = require('../../fixtures/siteinfo_enwiki.json');
const html =
    '<html>' +
    '<span typeof="mw:Image"><img resource="./File:Foo.jpg"/></span>' +
    '<figure typeof="mw:Video"><video resource="./File:Bar.ogv"/></figure>' +
    '</html>';
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
        const titles = media.getTitles(html);
        media.sort(titles, result.items, siteInfo);
        assert.deepEqual(result, sorted);
    });

});
