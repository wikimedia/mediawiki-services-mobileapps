'use strict';

const domino = require('domino');
const assert = require('../../utils/assert');
const parseSpoken = require('../../../lib/parseProperty').parseSpokenWikipedia;

function test(html, expected) {
    const doc = domino.createDocument(html);
    const result = parseSpoken(doc);
    if (expected) {
        assert.deepEqual(result.files.length, expected.files.length);
        for (let i = 0; i < expected.length; i++) {
            assert.deepEqual(result.files[i], expected.files[i]);
        }
    } else {
        assert.deepEqual(result, expected);
    }
}

describe('lib:parseSpokenWikipedia', () => {
    it('one spoken file', () => {
        const html = '<div id="section_SpokenWikipedia" data-mw=\'{"parts":[{"template":{"target":{"wt":"Spoken Wikipedia"},"params":{"1":{"wt":"Bill Clinton (spoken article).ogg"}}}}]}\'></div>';
        test(html, { files: [ 'File:Bill Clinton (spoken article).ogg' ] });
    });

    it('multiple spoken files', () => {
        const html = '<div id="section_SpokenWikipedia" data-mw=\'{"parts":[{"template":{"target":{"wt":"Spoken Wikipedia-2"},"params":{"1":{"wt":"2006-02-11"},"2":{"wt":"Douglas_Adams_Part_1.ogg"},"3":{"wt":"Douglas_Adams_Part_2.ogg"}}}}]}\'></div>';
        test(html, { files: [
            'File:Douglas_Adams_Part_1.ogg',
            'File:Douglas_Adams_Part_2.ogg'
        ] });
    });

    it('no spoken files', () => {
        test('<p>Foo</p>', undefined);
    });
});
