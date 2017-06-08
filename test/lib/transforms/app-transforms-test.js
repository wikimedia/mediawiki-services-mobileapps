'use strict';

const fs = require('fs');
const domino = require('domino');
const assert = require('../../utils/assert.js');
const a = require('../../../lib/transformations/anchorPopUpMediaTransforms');
const html = fs.readFileSync(`${__dirname}/../bill-clinton.html`, 'utf-8');

describe('lib:app-transforms', () => {
    it('fixVideoAnchor should skip video tags just holding audio', () => {
        const doc = domino.createDocument(`
<div><span typeof="mw:Audio"><span>
        <video
                controls=""
                preload="none">
                <source
                        src="https://upload.wikimedia.org/wikipedia/en/c/c4/Radiohead_-_Creep_%28sample%29.ogg"
                        type='audio/ogg; codecs="vorbis"'/>
        </video>
</span></span></div>`);
        a.fixVideoAnchor(doc);
        const videoThumbImgElements = doc.querySelectorAll('a.app_media');
        assert.equal(videoThumbImgElements.length, 0, 'Should not have marked the audio file');
    });

    it('fixVideoAnchor should transform actual videos', () => {
        const doc = domino.createDocument(`
<figure typeof="mw:Video/Thumb mw:Placeholder" id="mwBw"><span id="mwCA">
    <video controls="">
        <source src="https://upload.wikimedia.org/wikipedia/commons/9/96/Curiosity%27s_Seven_Minutes_of_Terror.ogv"
        type='video/ogg; codecs="theora, vorbis"' />
    </video>
</span></figure>`);
        a.fixVideoAnchor(doc);
        const videoThumbImgElements = doc.querySelectorAll('a.app_media');
        assert.equal(videoThumbImgElements.length, 0, 'Should have marked the video file');
    });

    it('fixVideoAnchor should apply app_media class to video anchors', () => {
        const doc = domino.createDocument(html);
        a.fixVideoAnchor(doc);
        const videoThumbImgElements = doc.querySelectorAll('a.app_media');
        assert.equal(videoThumbImgElements.length, 3, 'Failed to find app_media classes');
    });
});
