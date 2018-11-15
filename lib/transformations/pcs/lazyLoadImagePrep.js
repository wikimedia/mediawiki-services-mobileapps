'use strict';

const LazyLoadTransform = require('wikimedia-page-library').LazyLoadTransform;

/**
 * Prepare the document for lazy loading of images.
 * @param {!Document} document Parsoid page content DOM document
 */
module.exports = (document) => {
    const lazyLoadableImages = LazyLoadTransform.queryLazyLoadableImages(document.body);
    LazyLoadTransform.convertImagesToPlaceholders(document, lazyLoadableImages);
};
