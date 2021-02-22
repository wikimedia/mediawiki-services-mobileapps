'use strict';

const MATHOID_IMG_CLASS = 'mwe-math-fallback-image-inline';

const MediaSelectors = [
    '*[typeof^="mw:Image"]',
    '*[typeof^="mw:Video"]',
    '*[typeof^="mw:Audio"]',
    `img.${MATHOID_IMG_CLASS}`
];

const VideoSelectors = MediaSelectors.filter(selector => selector.includes('Video'));

const PronunciationParentSelector = 'span.IPA';
const PronunciationSelector = 'a[rel="mw:MediaLink"]';
const SpokenWikipediaSelector = 'div.spoken-wikipedia';

module.exports = {
    MediaSelectors,
    VideoSelectors,
    PronunciationParentSelector,
    PronunciationSelector,
    SpokenWikipediaSelector,
    MATHOID_IMG_CLASS
};
