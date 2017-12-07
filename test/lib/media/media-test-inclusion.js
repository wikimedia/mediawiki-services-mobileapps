/* eslint-disable max-len */

'use strict';

const assert = require('../../utils/assert');
const media = require('../../../lib/media');

const imageFigure = '<figure typeof="mw:Image"><img resource="./File:Foo"/></figure>';
const imageSpan = '<span typeof="mw:Image"><img resource="./File:Foo"/></span>';
const imageFigureInline = '<figure-inline typeof="mw:Image"><img resource="./File:Foo"/></figure-inline>';

const imageThumbFigure = '<figure typeof="mw:Image/Thumb"><img resource="./File:Foo"/></figure>';
const imageThumbSpan = '<span typeof="mw:Image/Thumb"><img resource="./File:Foo"/></span>';
const imageThumbFigureInline = '<figure-inline typeof="mw:Image/Thumb"><img resource="./File:Foo"/></figure-inline>';

const videoFigure = '<figure typeof="mw:Video"><video resource="./File:Foo"/></figure>';
const videoSpan = '<span typeof="mw:Video"><video resource="./File:Foo"/></span>';
const videoFigureInline = '<figure-inline typeof="mw:Video"><video resource="./File:Foo"/></figure-inline>';

const videoThumbFigure = '<figure typeof="mw:Video/Thumb"><video resource="./File:Foo"/></figure>';
const videoThumbSpan = '<span typeof="mw:Video/Thumb"><video resource="./File:Foo"/></span>';
const videoThumbFigureInline = '<figure-inline typeof="mw:Video/Thumb"><video resource="./File:Foo"/></figure-inline>';

const audioFigure = '<figure typeof="mw:Audio"><video resource="./File:Foo"/></figure>';
const audioSpan = '<span typeof="mw:Audio"><video resource="./File:Foo"/></span>';
const audioFigureInline = '<figure-inline typeof="mw:Audio"><video resource="./File:Foo"/></figure-inline>';

const noTypeFigure = '<figure><video resource="./File:Foo"/></figure>';
const noTypeSpan = '<span><video resource="./File:Foo"/></span>';
const noTypeFigureInline = '<figure-inline><video resource="./File:Foo"/></figure-inline>';

const imageNoViewer = '<figure typeof="mw:Image" class="noviewer"><img resource="./File:Foo"/></figure>';
const imageMetadata = '<span class="metadata"><figure typeof="mw:Image"><img resource="./File:Foo"/></figure></span>';
const imageNoArticleText = '<span class="noarticletext"><figure typeof="mw:Image"><img resource="./File:Foo"/></figure></span>';
const imageSiteNotice = '<span id="siteNotice"><figure typeof="mw:Image"><img resource="./File:Foo"/></figure></span>';
const imageSlideshowGallery =
    '<ul class="mw-gallery-slideshow">' +
        '<li class="gallerybox">' +
            '<figure typeof="mw:Image"><img resource="./File:Foo"/></figure>' +
        '</li>' +
    '</ul>';

const images = [imageFigure, imageSpan, imageFigureInline, imageThumbFigure, imageThumbSpan, imageThumbFigureInline];
const videos = [videoFigure, videoSpan, videoFigureInline, videoThumbFigure, videoThumbSpan, videoThumbFigureInline];
const audio = [audioFigure, audioSpan, audioFigureInline];
const validItems = images.concat(videos).concat(audio);

const noType = [noTypeFigure, noTypeSpan, noTypeFigureInline];
const blacklisted = [imageNoViewer, imageMetadata, imageNoArticleText, imageSiteNotice, imageSlideshowGallery];
const invalidItems = noType.concat(blacklisted);

describe('lib:media expected items are included or excluded', () => {

    it('items should be found for expected selectors', () => {
        const page = validItems.join('');
        const result = media.getMediaItemInfoFromPage(page);
        assert.deepEqual(result.length, validItems.length);
        assert.deepEqual(result.filter(i => i.title === 'File:Foo').length, validItems.length);
        assert.deepEqual(result.filter(i => i.type === media.Image.name).length, images.length);
        assert.deepEqual(result.filter(i => i.type === media.Video.name).length, videos.length);
        assert.deepEqual(result.filter(i => i.type === media.Audio.name).length, audio.length);
    });

    it('items should not be found for other selectors', () => {
        const page = invalidItems.join('');
        const result = media.getMediaItemInfoFromPage(page);
        assert.deepEqual(result.length, 0);
    });

});
