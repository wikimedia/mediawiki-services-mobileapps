/* eslint-env mocha */

'use strict';

const assert = require('../../utils/assert');
const domino = require('domino');
const fs = require('fs');
const NEWS_SITES = require('../../../etc/feed/news-sites');

describe('news headline selector', function() {
    this.timeout(20000); // eslint-disable-line no-invalid-this

    const timestamp = '2016-11-30';
    for (const lang of Object.keys(NEWS_SITES)) {
        it(`${lang} news should be general not categorical`, () => {
            const filename = `test/fixtures/news-site-${lang}-${timestamp}.htm`;
            const html = fs.readFileSync(filename);
            const doc = domino.createDocument(html);
            const selected = doc.querySelectorAll(NEWS_SITES[lang].headlineSelector);
            assert.closeTo(selected.length, 5, 3);
        });
    }
});
