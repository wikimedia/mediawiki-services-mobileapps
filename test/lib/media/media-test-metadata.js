'use strict';

const assert = require('../../utils/assert');
const domino = require('domino');
const media = require('../../../lib/media');
const getCodecs = media.testing.getCodecs;
const getStructuredSrcSet = media.testing.getStructuredSrcSet;
const imageInfo = require('../../../lib/imageinfo');
const getStructuredArtistInfo = imageInfo.getStructuredArtistInfo;
const makeResults = imageInfo.testing.makeResults;

const imageWithCaption =
    '<figure typeof="mw:Image">' +
        '<img resource="./File:Foo"/ width="100" height="100">' +
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
            '<source src="https://example.com/Foo.ogv"' +
                ' type=\'video/ogg\'' +
                ' data-title="Bar"' +
                ' data-shorttitle="Bar"' +
                ' data-file-width="120"' +
                ' data-file-height="120"' +
            '/>' +
        '</video>' +
    '</figure>';

const spokenWikipedia =
    '<div id="section_SpokenWikipedia">' +
        '<figure typeof="mw:Audio"><audio resource="./File:Foo"/></figure>' +
    '</div>';

const spokenWikipediaOld =
    '<div id="section_SpokenWikipedia">' +
        '<figure typeof="mw:Audio"><video resource="./File:Foo"/></figure>' +
    '</div>';

const pronunciationAudio =
    '<span class="IPA"></span>' +
    '<small>' +
        '<a rel="mw:MediaLink" title="Foo">Pronunciation</a>' +
    '</small>';

const imageWithSection =
    '<section data-mw-section-id="0">' +
        '<figure typeof="mw:Image">' +
            '<img resource="./File:Foo"/ width="100" height="100">' +
        '</figure>' +
    '</section>';

const imageWithPercentEncodedTitle =
    '<figure typeof="mw:Image">' +
        '<img resource="./File:What%3F.jpg" width="100" height="100">' +
    '</figure>';

const pronunciationWithPercentEncodedTitle =
    '<span class="IPA"></span>' +
    '<small>' +
        '(<span class="unicode haudio">' +
            '<a rel="mw:MediaLink" href="//upload.wikimedia.org/wikipedia/commons/4/48/En-us-' +
            'A.p.j._Abdul_Kalam_from_India_pronunciation_%28Voice_of_America%29.ogg" title=' +
            '"En-us-A.p.j. Abdul Kalam from India pronunciation %28Voice of America%29.ogg">' +
            'listen</a>' +
        '</span>)' +
    '</small>';

describe('lib:media metadata is correctly parsed from HTML', () => {

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
        assert.deepEqual(derivative.url, 'https://example.com/Foo.ogv');
        assert.deepEqual(derivative.mime, 'video/ogg');
        assert.deepEqual(derivative.codecs, [ 'theora', 'vorbis' ]);
        assert.deepEqual(derivative.name, 'Foo');
        assert.deepEqual(derivative.short_name, 'Foo');
        assert.deepEqual(derivative.width, 120);
        assert.deepEqual(derivative.height, 120);
    });

    it('media file derivative with no codecs in type attribute is parsed correctly', () => {
        const result = media.getMediaItemInfoFromPage(videoWithDerivative)[0];
        const derivative = result.sources[1];
        assert.deepEqual(derivative.url, 'https://example.com/Foo.ogv');
        assert.deepEqual(derivative.mime, 'video/ogg');
        assert.deepEqual(derivative.codecs, undefined);
        assert.deepEqual(derivative.name, 'Bar');
        assert.deepEqual(derivative.short_name, 'Bar');
        assert.deepEqual(derivative.width, 120);
        assert.deepEqual(derivative.height, 120);
    });

    it('spoken Wikipedia file is correctly identified', () => {
        const result = media.getMediaItemInfoFromPage(spokenWikipedia)[0];
        assert.deepEqual(result.audio_type, 'spoken');
    });

    it('spoken Wikipedia (OLD: with video tag) file is correctly identified', () => {
        const result = media.getMediaItemInfoFromPage(spokenWikipediaOld)[0];
        assert.deepEqual(result.audio_type, 'spoken');
    });

    // Skip until a long term solution for https://phabricator.wikimedia.org/T214338 is found
    it.skip('pronunciation audio file is correctly identified', () => {
        const result = media.getMediaItemInfoFromPage(pronunciationAudio)[0];
        assert.deepEqual(result.title, 'File:Foo');
        assert.deepEqual(result.type, 'audio');
        assert.deepEqual(result.audio_type, 'pronunciation');
    });

    it('section is correctly identified', () => {
        const result = media.getMediaItemInfoFromPage(imageWithSection)[0];
        assert.deepEqual(result.section_id, 0);
    });

    it('titles are decoded after parsing from HTML', () => {
        const result = media.getMediaItemInfoFromPage(imageWithPercentEncodedTitle)[0];
        assert.deepEqual(result.title, 'File:What?.jpg');
    });

    // Skip until a long term solution for https://phabricator.wikimedia.org/T214338 is found
    it.skip('pronunciation titles are decoded after parsing from HTML', () => {
        const result = media.getMediaItemInfoFromPage(pronunciationWithPercentEncodedTitle)[0];
        assert.deepEqual(result.title, 'File:En-us-A.p.j. Abdul Kalam from India pronunciation (Voice of America).ogg');
    });

    it('items without imageinfo properties (e.g., deleted items) are filtered', () => {
        assert.deepEqual(makeResults([1], undefined, [ { id: 1 } ]), {});
    });
});

describe('lib:media parse structured artist info', () => {

    it('all info is parsed from common HTML structure', () => {
        const html = '<a href="//commons.wikimedia.org/wiki/User:Foo" title="User:Foo">Foo</a>';
        const result = getStructuredArtistInfo(html, 'en');
        assert.deepEqual(result.html, html);
        assert.deepEqual(result.name, 'Foo');
        assert.deepEqual(result.user_page, 'https://commons.wikimedia.org/wiki/User:Foo');
    });

    it("'html' and 'name' fields are returned from plain text input", () => {
        const html = 'Foo';
        const result = getStructuredArtistInfo(html, 'en');
        assert.deepEqual(result.html, html);
        assert.deepEqual(result.name, html);
        assert.deepEqual(result.user_page, undefined);
    });

    it('only html returned for site other than Commons', () => {
        const html = '<a href="//example.com/wiki/User:Foo" title="User:Foo">Foo</a>';
        const result = getStructuredArtistInfo(html, 'en');
        assert.deepEqual(result.html, html);
        assert.deepEqual(result.name, undefined);
        assert.deepEqual(result.user_page, undefined);
    });

    it('only html returned if additional text is present', () => {
        const html = '<a href="//commons.wikimedia.org/wiki/User:Foo" title="User:Foo">Foo</a>, ' +
            'Jimbo Wales';
        const result = getStructuredArtistInfo(html, 'en');
        assert.deepEqual(result.html, html);
        assert.deepEqual(result.name, undefined);
        assert.deepEqual(result.user_page, undefined);
    });

    it('only html returned if non-namespace portion of the title !== html.textContent', () => {
        const html = '<a href="//commons.wikimedia.org/wiki/User:Foo" title="User:Foo">Bar</a>';
        const result = getStructuredArtistInfo(html, 'en');
        assert.deepEqual(result.html, html);
        assert.deepEqual(result.name, undefined);
        assert.deepEqual(result.user_page, undefined);
    });

    it('parses html with lang from metadata object', () => {
        const obj = { en: 'Foo', de: 'Bar' };
        const result = getStructuredArtistInfo(obj, 'en');
        assert.deepEqual(result.html, obj.en);
        assert.deepEqual(result.name, 'Foo');
        assert.deepEqual(result.lang, 'en');
        assert.deepEqual(result.user_page, undefined);
    });

    it('parses html with lang (non-English) from metadata object', () => {
        const obj = { en: 'Foo', de: 'Bar' };
        const result = getStructuredArtistInfo(obj, 'de');
        assert.deepEqual(result.html, obj.de);
        assert.deepEqual(result.name, 'Bar');
        assert.deepEqual(result.lang, 'de');
        assert.deepEqual(result.user_page, undefined);
    });

    it('undefined result if input is an empty string', () => {
        const result = getStructuredArtistInfo('', 'en');
        assert.deepEqual(result, undefined);
    });
});

describe('lib:media:getCodecs', () => {
    it('codecs are parsed from type attributes without errors', () => {
        assert.deepEqual(getCodecs('video/webm; codecs="vp8, vorbis"'), [ 'vp8', 'vorbis' ]);
        assert.deepEqual(getCodecs('video/webm'), undefined);
        assert.deepEqual(getCodecs(undefined), undefined);
        assert.deepEqual(getCodecs(';;;;111;;!1lksjdfd:'), undefined);
        assert.deepEqual(getCodecs('¯\\_(ツ)_/¯'), undefined);
    });
});

describe('lib:media:getStructuredSrcSet', () => {
    it('should return structured srcset values', () => {
        const doc = domino.createDocument('<img srcset="//image1 1.5x, //image2 2x">');
        const img = doc.querySelector('img');
        const expected = [ { src: '//image1', scale: '1.5x' }, { src: '//image2', scale: '2x' } ];
        assert.deepEqual(getStructuredSrcSet(img), expected);
    });
    it('should return structured srcset and src values', () => {
        const doc = domino.createDocument('<img src="//image" srcset="//image1 1.5x, //image2 2x">');
        const img = doc.querySelector('img');
        const expected = [
            { src: '//image', scale: '1x' },
            { src: '//image1', scale: '1.5x' },
            { src: '//image2', scale: '2x' }
        ];
        assert.deepEqual(getStructuredSrcSet(img), expected);
    });
    it('should return 1x if no scale is present in the srcset values', () => {
        const doc = domino.createDocument('<img srcset="//image1"></img>');
        const img = doc.querySelector('img');
        assert.deepEqual(getStructuredSrcSet(img)[0].scale, '1x');
    });
    it('should return empty array if srcset is empty', () => {
        const doc = domino.createDocument('<img></img>');
        const img = doc.querySelector('img');
        assert.deepEqual(getStructuredSrcSet(img), []);
    });
});
