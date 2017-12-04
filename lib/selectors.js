'use strict';

const MediaSelectors = [
    'figure[typeof^=mw:Image]',
    'figure[typeof^=mw:Video]',
    'figure[typeof^=mw:Audio]',
    'span[typeof^=mw:Image]',
    'span[typeof^=mw:Video]',
    'span[typeof^=mw:Audio]',
    'figure-inline[typeof^=mw:Image]',
    'figure-inline[typeof^=mw:Video]',
    'figure-inline[typeof^=mw:Audio]',
    'span.IPA+small a[rel=mw:MediaLink]'
];

const ImageSelectors = MediaSelectors.filter(selector => selector.includes('Image'));
const VideoSelectors = MediaSelectors.filter(selector => selector.includes('Video'));
const PronunciationSelector = MediaSelectors.filter(selector => selector.includes('IPA'))[0];

const SpokenWikipediaId = 'section_SpokenWikipedia';


module.exports = {
    MediaSelectors,
    ImageSelectors,
    VideoSelectors,
    PronunciationSelector,
    SpokenWikipediaId
};
