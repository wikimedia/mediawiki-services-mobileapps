'use strict';

const domino = require('domino');
const assert = require('../../utils/assert');
const lib = require('../../../lib/mobile/MobileViewHTML');

describe('lib:mobileview-html', () => {
    describe('buildSection', () => {
        it('section 0', () => {
            const document = domino.createDocument('');
            const result = lib.testing.buildSection(document,
                { id: 0, text: 'lead' });
            assert.deepEqual(result.outerHTML,
                '<section data-mw-section-id="0" id="content-block-0">lead</section>');
        });
        it('section 1', () => {
            const document = domino.createDocument('');
            const result = lib.testing.buildSection(document,
                {
                    id: 1,
                    toclevel: 1,
                    line: 'My section heading',
                    anchor: 'heading_anchor',
                    text: '<p>Foo Bar</p>'
                });
            assert.deepEqual(result.outerHTML,
                '<section data-mw-section-id="1"><h2 id="heading_anchor">My section heading</h2><p>Foo Bar</p></section>');
        });
    });

    describe('rewriteWikiLinks', () => {
        it('single link', () => {
            const document = domino.createDocument('<p><a href="/wiki/A"></a></p>');
            const result = lib.testing.rewriteWikiLinks(document, 'a', 'href');
            assert.deepEqual(document.body.innerHTML, '<p><a href="./A"></a></p>');
        });
    });

    describe('wrapImagesInFigureElements', () => {
        it('single image', () => {
            const document = domino.createDocument(
                '<p><a class="image" href="target"><img src="foo"/></a></p>');
            const result = lib.testing.wrapImagesInFigureElements(document,
                { id: 0, text: 'lead' });
            assert.deepEqual(document.body.innerHTML,
                '<p><figure class="mw-default-size"><a class="image" href="target"><img src="foo"></a></figure></p>');
        });
    });
});
