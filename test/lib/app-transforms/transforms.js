'use strict';

const fs = require('fs');
const domino = require('domino');
const assert = require('../../utils/assert.js');
const a = require('../../../lib/transformations/anchorPopUpMediaTransforms');
const html = fs.readFileSync(__dirname + '/../bill-clinton.html', 'utf-8');

describe('lib:app-transforms', function() {
    it('fixVideoAnchor should apply app_media class to all video anchors', function() {
        const doc = domino.createDocument(html);
        a.fixVideoAnchor(doc);
        const videoThumbImgElements = doc.querySelectorAll('a[href] > img[data-file-type="video"]');
        let haveAppMedia = 0;
        for (let i = 0, n = videoThumbImgElements.length; i < n; i++) {
            const elem = videoThumbImgElements[i];
            for (let j = 0, m = elem.parentNode.classList.length; j < m; j++) {
                if (elem.parentNode.classList[j] === 'app_media') {
                    haveAppMedia++;
                }
            }
        }
        assert.ok(videoThumbImgElements.length === 3, 'Failed to find video thumb img elements');
        assert.deepEqual(haveAppMedia, videoThumbImgElements.length);
    });
});