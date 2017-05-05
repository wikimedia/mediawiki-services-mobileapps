'use strict';

const fs = require('fs');
const domino = require('domino');
const assert = require('../../utils/assert.js');
const a = require('../../../lib/transformations/anchorPopUpMediaTransforms');
const html = fs.readFileSync(`${__dirname}/../bill-clinton.html`, 'utf-8');

describe('lib:app-transforms', () => {
    it('fixVideoAnchor should apply app_media class to all video anchors', () => {
        const doc = domino.createDocument(html);
        a.fixVideoAnchor(doc);
        const videoThumbImgElements = doc.querySelectorAll('a.app_media');
        assert.equal(videoThumbImgElements.length, 6, 'Failed to find app_media classes');
    });
});
