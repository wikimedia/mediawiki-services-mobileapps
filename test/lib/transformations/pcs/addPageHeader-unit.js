'use strict';

const domino = require('domino');
const assert = require('../../../utils/assert.js');
const addPageHeader = require('../../../../lib/transformations/pcs/addPageHeader');
const testUtil = require('../../../utils/testUtil');

describe('lib:addPageHeader', () => {
    it('addPageHeader should add header element with description', () => {
        const document = testUtil.readTestFixtureDoc('Dog.html');

        addPageHeader(document, {
            mw: {
                displaytitle: 'Dog',
                description: 'short desc',
                description_source: 'central',
            },
            pronunciation: { url: 'foo' }
        });

        const header = document.body.querySelector('header');
        assert.ok(header);
        const pronunciationLink = header.querySelector('#pcs-edit-section-title-pronunciation');
        assert.ok(pronunciationLink);
        assert.ok(pronunciationLink.getAttribute('data-action', 'title_pronunciation'));
        assert.deepEqual(header.querySelector('#pcs-edit-section-title-description').innerHTML,
            'short desc');
        assert.ok(header.querySelector('#pcs-edit-section-divider'));
    });

    it('addPageHeader handles documents with no section elements', () => {
        const doc = domino.createDocument();
        const meta = { mw: {} };
        try {
            addPageHeader(doc, meta);
            assert.ok(true);
        } catch (e) {
            assert.fail(e);
        }
    });
});
