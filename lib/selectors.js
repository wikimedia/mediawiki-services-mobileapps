'use strict';

/**
 * @module lib/selectors
 */

const MATHOID_IMG_CLASS = 'mwe-math-fallback-image-inline';

const MediaSelectors = [
	`img.${MATHOID_IMG_CLASS}`,
	'*[typeof^="mw:File"]',
	// TODO: Remove "Image|Video|Audio" when version 2.4.0 of the content
	// is no longer supported
	'*[typeof^="mw:Image"]',
	'*[typeof^="mw:Video"]',
	'*[typeof^="mw:Audio"]'
];

const VideoSelectors = [
	'*[typeof^="mw:File"] video',
	// TODO: Remove mw:Video when version 2.4.0 of the content is no longer
	// supported
	'*[typeof^="mw:Video"] video'
];

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
