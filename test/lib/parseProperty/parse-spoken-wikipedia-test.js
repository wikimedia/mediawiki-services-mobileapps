'use strict';

const fs = require('fs');
const domino = require('domino');
const assert = require('../../utils/assert.js');
const parseProp = require('../../../lib/parseProperty');
const html = fs.readFileSync(`${__dirname}/../bill-clinton.html`, 'utf-8');

describe('lib:parseSpokenWikipedia', () => {
    it('Parsed spoken Wikipedia should have correct number of page.spoken.files', () => {
        const doc = domino.createDocument(html);
        const page = {};
        parseProp.parseSpokenWikipedia(doc, page);
        assert.deepEqual(page.spoken.files.length, 1);
        assert.deepEqual(page.spoken.files[0], 'File:Bill Clinton (spoken article).ogg');
    });
});

