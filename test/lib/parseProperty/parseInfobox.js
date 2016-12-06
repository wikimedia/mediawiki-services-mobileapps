'use strict';

const fs = require('fs');
const domino = require('domino');
const assert = require('../../utils/assert.js');
const parseProp = require('../../../lib/parseProperty');
const html = fs.readFileSync(`${__dirname}/../bill-clinton.html`, 'utf-8');

describe('lib:parseInfobox', () => {
    it('Parsed infobox should have correct number of rows', () => {
        const doc = domino.createDocument(html);
        const infobox = parseProp.parseInfobox(doc);
        assert.deepEqual(infobox.length, 31);
    });
});
