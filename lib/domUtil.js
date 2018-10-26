'use strict';

/**
 * Returns true if the nearest ancestor to the given element has a class set for Right-to-Left mode,
 * false otherwise.
 * @param {!Element} element a DOM element
 */
function isRTL(element) {
    const closestDirectionalAncestor = element.closest('[dir]');
    if (closestDirectionalAncestor) {
        return closestDirectionalAncestor.getAttribute('dir') === 'rtl';
    }
    return false;
}

module.exports = {
    isRTL
};
