'use strict';

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
const isDisallowed = (elem) => {
    return !!(elem.closest(EXCLUSION_SELECTOR));
};

const isFromGallery = (elem) => {
    return !!(elem.closest('.gallerybox'));
};

const adjustSrcSet = (srcSet, origWidth, candidateBucketWidth) => {
    const srcSetEntries = srcSet.split(',').map(str => str.trim());
    const updatedEntries = [];
    srcSetEntries.forEach((entry) => {
        const entryParts = entry.split(' ');
        const src = entryParts[0];
        const res = entryParts[1];
        const multiplier = res.substring(0, res.toLowerCase().indexOf('x'));
        const desiredWidth = candidateBucketWidth * multiplier;
        if (desiredWidth < origWidth) {
            const scaledThumbUrl = scaleURL(src, desiredWidth, origWidth);
            if (scaledThumbUrl) {
                updatedEntries.push(`${scaledThumbUrl} ${res}`);
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
    scaleElementIfNecessary
};
