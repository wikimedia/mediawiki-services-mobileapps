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
const SpokenWikipediaId = '#section_SpokenWikipedia';

module.exports = {
    MediaSelectors,
    VideoSelectors,
    PronunciationParentSelector,
    PronunciationSelector,
    SpokenWikipediaId,
    MATHOID_IMG_CLASS
};
