'use strict';

const domino = require('domino');
const assert = require('../../utils/assert');
const parsePronunciation = require('../../../lib/parseProperty').parsePronunciation;

function test(html, expected) {
    const doc = domino.createDocument(html);
    const result = parsePronunciation(doc);
    if (expected) {
        assert.deepEqual(result.url, expected.url);
    } else {
        assert.deepEqual(result, expected);
    }
}

describe('lib:parsePronunciation', () => {
    it('has pronunciation file v1', () => {
        const html = '<span class="IPA"></span><small><a rel="mw:MediaLink" href="A.ogg"></a></small>';
        test(html, { url: 'A.ogg' });
    });

    it('has pronunciation file v2', () => {
        const html = '<span class="IPA"></span>' +
            // An extra sibling
            '<span typeof="mw:Entity"> </span>' +
            // Sibling 2
            '<span class"nowrap">(<span class="unicode haudio">' +
            // There are actually more nested <span>s in the real output.
            // Can't just look for any anchor. There are some other ones we don't want.
            '<figure-inline><a href="./File:En-us-Barack-Hussein-Obama.ogg"></a></figure-inline>' +
            // This is the one we want:
            '<a rel="mw:MediaLink" href="B.ogg">listen</a>' +
            '</span>)' +
            '</span>';
        test(html, { url: 'B.ogg' });
    });

    it('no pronunciation file', () => {
        test('<p>Foo</p>', undefined);
    });
});
