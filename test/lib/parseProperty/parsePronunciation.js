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
    it('has pronunciation file', () => {
        const html = '<span class="IPA"></span><small><a rel="mw:MediaLink" href="A.ogg"></a></small>'; // eslint-disable-line max-len
        test(html, { url: 'A.ogg' });
    });

    it('no pronunciation file', () => {
        test('<p>Foo</p>', undefined);
    });
});
