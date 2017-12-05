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

const images = [imageFigure, imageSpan, imageFigureInline, imageThumbFigure, imageThumbSpan, imageThumbFigureInline];
const videos = [videoFigure, videoSpan, videoFigureInline, videoThumbFigure, videoThumbSpan, videoThumbFigureInline];
const audio = [audioFigure, audioSpan, audioFigureInline];

const validItems = images.concat(videos).concat(audio);
const invalidItems = [noTypeFigure, noTypeSpan, noTypeFigureInline];

const imageWithCaption =
    '<figure typeof="mw:Image">' +
        '<img resource="./File:Foo"/>' +
        '<figcaption>An <i>example</i> image</figcaption>' +
    '</figure>';

const videoWithMetadata =
    '<figure typeof="mw:Video" data-mw=\'{"starttime": "1", "thumbtime": "2", "endtime": "3"}\'>' +
        '<video resource="./File:Foo"/>' +
    '</figure>';

const videoWithDerivative =
    '<figure typeof="mw:Video">' +
        '<video resource="./File:Foo">' +
            '<source src="https://example.com/Foo.ogv"' +
                   ' type=\'video/ogg; codecs="theora, vorbis"\'' +
                   ' data-title="Foo"' +
                   ' data-shorttitle="Foo"' +
                   ' data-file-width="120"' +
                   ' data-file-height="120"' +
            '/>' +
        '</video>' +
    '</figure>';

const spokenWikipedia =
    '<div id="section_SpokenWikipedia">' +
        '<figure typeof="mw:Audio"><video resource="./File:Foo"/></figure>' +
    '</div>';

const pronunciationAudio =
    '<span class="IPA"></span>' +
    '<small>' +
        '<a rel="mw:MediaLink" title="Foo">Pronunciation</a>' +
    '</small>';

describe('lib:media', () => {

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

    it('all expected captions are present', () => {
        const result = media.getMediaItemInfoFromPage(imageWithCaption)[0];
        assert.deepEqual(result.caption.html, 'An <i>example</i> image');
        assert.deepEqual(result.caption.text, 'An example image');
    });

    it('all expected data-mw properties are present', () => {
        const result = media.getMediaItemInfoFromPage(videoWithMetadata)[0];
        assert.deepEqual(result.start_time, 1);
        assert.deepEqual(result.thumb_time, 2);
        assert.deepEqual(result.end_time, 3);
    });

    it('all expected derivative properties are present', () => {
        const result = media.getMediaItemInfoFromPage(videoWithDerivative)[0];
        const derivative = result.sources[0];
        assert.deepEqual(derivative.source, 'https://example.com/Foo.ogv');
        assert.deepEqual(derivative.mime, 'video/ogg');
        assert.deepEqual(derivative.codecs, [ "theora", "vorbis" ]);
        assert.deepEqual(derivative.name, 'Foo');
        assert.deepEqual(derivative.short_name, 'Foo');
        assert.deepEqual(derivative.width, 120);
        assert.deepEqual(derivative.height, 120);
    });

    it('spoken Wikipedia file is correctly identified', () => {
        const result = media.getMediaItemInfoFromPage(spokenWikipedia)[0];
        assert.deepEqual(result.audio_type, 'spoken');
    });

    it('pronunciation audio file is correctly identified', () => {
        const result = media.getMediaItemInfoFromPage(pronunciationAudio)[0];
        assert.deepEqual(result.title, 'File:Foo');
        assert.deepEqual(result.type, 'audio');
        assert.deepEqual(result.audio_type, 'pronunciation');
    });

});
