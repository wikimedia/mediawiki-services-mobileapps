'use strict';

const LazyLoadTransform = require('wikimedia-page-library').LazyLoadTransform;

/**
 * Prepare the document for lazy loading of images.
 * @param {!Document} document Parsoid page content DOM document
 */
const lazyLoadImagePrep = (document) => {
    const lazyLoadableImages = LazyLoadTransform.queryLazyLoadableImages(document.body);
    LazyLoadTransform.convertImagesToPlaceholders(document, lazyLoadableImages);
};

module.exports = lazyLoadImagePrep;
