/* eslint-disable max-len */

'use strict';

const assert = require('../../utils/assert');
const media = require('../../../lib/media');
const image = media.testing.imageName;
const video = media.testing.videoName;
const audio = media.testing.audioName;

const imageFigure = '<figure typeof="mw:Image"><img resource="./File:A" width="100" height="100"/></figure>';
const imageSpan = '<span typeof="mw:Image"><img resource="./File:B" width="100" height="100"/></span>';
const imageFigureInline = '<figure-inline typeof="mw:Image"><img resource="./File:C" width="100" height="100"/></figure-inline>';

const imageThumbFigure = '<figure typeof="mw:Image/Thumb"><img resource="./File:D" width="100" height="100"/></figure>';
const imageThumbSpan = '<span typeof="mw:Image/Thumb"><img resource="./File:E" width="100" height="100"/></span>';
const imageThumbFigureInline = '<figure-inline typeof="mw:Image/Thumb"><img resource="./File:F" width="100" height="100"/></figure-inline>';

const mathImage = '<img src="https://wikimedia.org/api/rest_v1/media/math/render/svg/11235" class="mwe-math-fallback-image-inline">';
const timelineImage = '<div typeof="mw:Extension/timeline mw:Transclusion"></map><img src="//upload.wikimedia.org/wikipedia/en/timeline/1234.png"></div>'; // has no width or height

const videoFigure = '<figure typeof="mw:Video"><video resource="./File:G"/></figure>';
const videoSpan = '<span typeof="mw:Video"><video resource="./File:H"/></span>';
const videoFigureInline = '<figure-inline typeof="mw:Video"><video resource="./File:I"/></figure-inline>';

const videoThumbFigure = '<figure typeof="mw:Video/Thumb"><video resource="./File:J"/></figure>';
const videoThumbSpan = '<span typeof="mw:Video/Thumb"><video resource="./File:K"/></span>';
const videoThumbFigureInline = '<figure-inline typeof="mw:Video/Thumb"><video resource="./File:L"/></figure-inline>';

const audioFigure = '<figure typeof="mw:Audio"><audio resource="./File:M"/></figure>';
const audioSpan = '<span typeof="mw:Audio"><audio resource="./File:N"/></span>';
const audioFigureInline = '<figure-inline typeof="mw:Audio"><audio resource="./File:O"/></figure-inline>';

const audioVideoFigure = '<figure typeof="mw:Audio"><video resource="./File:M2"/></figure>';
const audioVideoSpan = '<span typeof="mw:Audio"><video resource="./File:N2"/></span>';
const audioVideoFigureInline = '<figure-inline typeof="mw:Audio"><video resource="./File:O2"/></figure-inline>';

const noTypeFigure = '<figure><video resource="./File:P"/></figure>';
const noTypeSpan = '<span><video resource="./File:Q"/></span>';
const noTypeFigureInline = '<figure-inline><video resource="./File:R"/></figure-inline>';

const imageNoViewer = '<figure typeof="mw:Image" class="noviewer"><img resource="./File:S" width="100" height="100"/></figure>';
const imageMetadata = '<span class="metadata"><figure typeof="mw:Image"><img resource="./File:T" width="100" height="100"/></figure></span>';

const falsePositive = '<figure typeof="mw:Image" class="noviewer"><img resource="./File:S"/></figure>';

const images = [imageFigure, imageSpan, imageFigureInline, imageThumbFigure, imageThumbSpan, imageThumbFigureInline, mathImage, timelineImage];
const videos = [videoFigure, videoSpan, videoFigureInline, videoThumbFigure, videoThumbSpan, videoThumbFigureInline];
const audios = [audioFigure, audioSpan, audioFigureInline,
    // TODO: remove after Parsoid change https://gerrit.wikimedia.org/r/c/mediawiki/services/parsoid/+/449903 is deployed
    audioVideoFigure, audioVideoSpan, audioVideoFigureInline];
const validItems = images.concat(videos).concat(audios);

const noType = [noTypeFigure, noTypeSpan, noTypeFigureInline];
const blacklisted = [imageNoViewer, imageMetadata];
const invalidItems = noType.concat(blacklisted);

describe('lib:media expected items are included or excluded', () => {

    it('items should be found for expected selectors', () => {
        const page = validItems.join('');
        const result = media.getMediaItemInfoFromPage(page);
        assert.deepEqual(result.length, validItems.length);
        assert.deepEqual(result.filter(i => i.type === image).length, images.length);
        assert.deepEqual(result.filter(i => i.type === video).length, videos.length);
        assert.deepEqual(result.filter(i => i.type === audio).length, audios.length);
    });

    it('items should not be found for other selectors', () => {
        const page = invalidItems.join('');
        const result = media.getMediaItemInfoFromPage(page);
        assert.deepEqual(result.length, 0);
    });

    it('false positives should be filtered', () => {
        const result = media.getMediaItemInfoFromPage(falsePositive);
        assert.deepEqual(result.length, 0);
    });

});
