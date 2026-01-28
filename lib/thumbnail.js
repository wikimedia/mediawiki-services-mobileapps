'use strict';

const _ = require('lodash');

/**
 * @module lib/thumbnail
 */

const mwapiConstants = require('./mwapi-constants');
const THUMB_URL_PATH_REGEX = /\/thumb\//;
const THUMB_WIDTH_REGEX = /(\d+)px-[^/]+$/;
const MIN_IMAGE_SIZE = 48;
// Exclusions for various categories of content. See MMVB.isAllowedThumb in mediawiki-extensions-
// MultimediaViewer.
const EXCLUSION_SELECTOR = '.metadata,.noviewer';

const thumbBucketWidthCandidates = [
	mwapiConstants.LEAD_IMAGE_M,
	mwapiConstants.LEAD_IMAGE_S
];

// Predefined thumb sizes from MW
// https://www.mediawiki.org/wiki/Common_thumbnail_sizes
const ALLOWED_THUMB_WIDTHS = [20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840];

/**
 * Finds the index of the closest allowed width from ALLOWED_THUMB_WIDTHS
 *
 * @param {!number} width the desired width
 * @return {!number} index of the closest allowed width
 */
function findClosestWidthIndex(width) {
	const index = _.sortedIndex(ALLOWED_THUMB_WIDTHS, width);

	if (index === 0) {
		return 0;
	} else if (index >= ALLOWED_THUMB_WIDTHS.length) {
		return ALLOWED_THUMB_WIDTHS.length - 1;
	}

	const before = ALLOWED_THUMB_WIDTHS[index - 1];
	const after = ALLOWED_THUMB_WIDTHS[index];
	return Math.abs(before - width) <= Math.abs(after - width) ? index - 1 : index;
}
/**
 * Scales a single image thumbnail URL to another size, if possible.
 *
 * @param {!string} initialUrl an initial thumbnail URL for an image, for example:
 *     https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Foo.jpg/640px-Foo.jpg
 * @param {!number} desiredWidth the desired width
 * @param {?number} originalWidth the original width, if known
 * @return {?string} URL updated with the desired size, if available
 */
const scaleURL = function(initialUrl, desiredWidth, originalWidth) {
	if (!initialUrl.match(THUMB_URL_PATH_REGEX)) {
		// not a thumb URL
		return;
	}
	const match = THUMB_WIDTH_REGEX.exec(initialUrl);
	if (match) {
		const maxWidth = originalWidth || match[1];
		if (maxWidth > desiredWidth) {
			const newSubstring = match[0].replace(match[1], desiredWidth);
			return initialUrl.replace(THUMB_WIDTH_REGEX, newSubstring);
		}
	}
};

/**
 * Returns whether the on-page size of an <img> element is small enough to filter from the response
 *
 * @param {!Element} img an <img> element
 */
const isTooSmall = function(img) {
	const width = img.getAttribute('width');
	const height = img.getAttribute('height');
	return width < MIN_IMAGE_SIZE || height < MIN_IMAGE_SIZE;
};

/**
 * Returns whether the element or an ancestor is part of a disallowed class
 *
 * @param {!Element} elem an HTML Element
 * @return {!boolean} true if the element or an ancestor is part of a disallowed class
 */
const isDisallowed = (elem) => !!(elem.closest(EXCLUSION_SELECTOR));

const isFromGallery = (elem) => !!(elem.closest('.gallerybox'));

const adjustSrcSet = (srcSet, origWidth, candidateBucketWidth) => {
	const srcSetEntries = srcSet.split(',').map(str => str.trim());
	const updatedEntries = [];

	// Find the 1x bucket index using closest match
	const baseIndex = findClosestWidthIndex(candidateBucketWidth);

	srcSetEntries.forEach((entry) => {
		const entryParts = entry.split(' ');
		const src = entryParts[0];
		const res = entryParts[1]; // Keep original multiplier label (1x, 1.5x, 2x)
		const multiplier = parseFloat(res);
		const bucketIndex = baseIndex + (multiplier <= 1 ? 0 : multiplier <= 1.5 ? 1 : 2);

		// Skip if we've run out of buckets
		if (bucketIndex >= ALLOWED_THUMB_WIDTHS.length) {
			return;
		}

		const width = ALLOWED_THUMB_WIDTHS[bucketIndex];

		if (width < origWidth) {
			const scaledThumbUrl = scaleURL(src, width, origWidth);
			if (scaledThumbUrl) {
				updatedEntries.push(`${ scaledThumbUrl } ${ res }`);
			}
		}
	});
	if (updatedEntries.length) {
		return updatedEntries.join(', ');
	}
};

/**
 * Scale thumbnail img
 *
 * @param {!Element} img
 */
const scaleElementIfNecessary = function(img) {
	if (isTooSmall(img) || isDisallowed(img) || isFromGallery(img)) {
		return;
	}
	const src = img.getAttribute('src');
	const srcSet = img.getAttribute('srcset');
	const width = img.getAttribute('width');
	const height = img.getAttribute('height');
	const origWidth = img.getAttribute('data-file-width');

	// Store original src as data attribute
	img.setAttribute('data-file-original-src', src);

	for (let i = 0; i < thumbBucketWidthCandidates.length; i++) {
		const candidateBucketWidth = thumbBucketWidthCandidates[i];
		if (candidateBucketWidth >= origWidth) {
			continue;
		}
		const scaledUrl = scaleURL(src, candidateBucketWidth, origWidth);
		if (scaledUrl) {
			img.setAttribute('src', scaledUrl);
			img.setAttribute('height', Math.round(height * candidateBucketWidth / width));
			img.setAttribute('width', candidateBucketWidth);
			if (srcSet) {
				const adjustedSrcSet = adjustSrcSet(srcSet, origWidth, candidateBucketWidth);
				if (adjustedSrcSet) {
					img.setAttribute('srcSet', adjustedSrcSet);
				} else {
					img.removeAttribute('srcSet');
				}
			}
			break;
		}
	}
};

module.exports = {
	isTooSmall,
	isDisallowed,
	isFromGallery,
	scaleURL,
	scaleElementIfNecessary,
	adjustSrcSet,
	findClosestWidthIndex,
	ALLOWED_THUMB_WIDTHS
};
