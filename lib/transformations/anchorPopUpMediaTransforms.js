/**
 * DOM transformation shared with app. Let's keep this in sync with the app.
 * Last sync: Android repo 3d5b441 www/js/transforms/anchorPopUpMediaTransforms.js
 *
 * Look for video elements, and wrap them inside an anchor with the right class and
 * the href set to the File title of the resource so that it opens up the video
 * in the Android app gallery.
 * It's a bit of a hack to make existing Android app versions handle the video elements.
 * Newer versions should handle video elements directly.
 * Still it's the Parsoid equivalent of a mobileview anchorPopUpMediaTransforms().
 */

'use strict';

function fixVideoAnchor(content) {
    const videoElements = content.querySelectorAll('video');
    for (let i = 0; i < videoElements.length; i++) {
        const videoElem = videoElements[i];

        const containerLink = content.createElement('a');
        containerLink.setAttribute('href',
            videoElem.getAttribute('resource').replace('./', '/wiki/'));
        containerLink.classList.add('app_media');

        // wrap videoElem in anchor:
        videoElem.parentNode.insertBefore(containerLink, videoElem);
        videoElem.parentNode.removeChild(videoElem);
        containerLink.appendChild(videoElem);

        // remove controls
        videoElem.removeAttribute('controls');
    }
}

module.exports = {
    fixVideoAnchor
};
