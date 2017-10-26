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

const NodeType = require('../nodeType');

/**
 * Checks if a <video> element is an actual video.
 * Parsoid also uses <video> tags for audio files.
 * @return {boolean} true if real video
 */
function isVideo(videoElem) {
    const MAX_LEVEL = 3;
    let node = videoElem.parentNode;
    for (let level = 0; level < MAX_LEVEL; level++) {
        if (!node) {
            return false;
        }

        // Look for an ancestor element <figure typeof="mw:Video/Thumb">
        // or <figure-inline typeof="mw:Video">.
        if (node.nodeType === NodeType.ELEMENT_NODE
                    && (node.nodeName === 'FIGURE' ||
                        node.nodeName === 'FIGURE-INLINE' ||
                        // TODO: <span> is here for backwards compatibility.
                        // This is now generated as <figure-inline> and should
                        // be safe to remove when verion 1.5 content is no
                        // longer acceptable.
                        node.nodeName === 'SPAN')) {
            const typeOf = node.getAttribute('typeof');
            if (typeOf === 'mw:Video/Thumb' || typeOf === 'mw:Video') {
                return true;
            }
        }

        node = node.parentNode;
    }

    return false;
}

function fixVideoAnchor(content) {
    const videoElements = content.querySelectorAll('video');
    for (let i = 0; i < videoElements.length; i++) {
        const videoElem = videoElements[i];

        // T167183: Only handle videos
        if (!isVideo(videoElem)) {
            continue;
        }

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
