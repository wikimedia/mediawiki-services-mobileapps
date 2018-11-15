'use strict';

const domUtil = {};

/**
 * Returns true if the nearest ancestor to the given element has a class set for Right-to-Left mode,
 * false otherwise.
 * @param {!Element} element a DOM element
 */
domUtil.isRTL = (element) => {
    const closestDirectionalAncestor = element.closest('[dir]');
    if (closestDirectionalAncestor) {
        return closestDirectionalAncestor.getAttribute('dir') === 'rtl';
    }
    return false;
};

/**
 * Gets the base URI from a Parsoid document
 * <base href="//en.wikipedia.org/wiki/"/>
 * @param {!Document} doc Parsoid DOM document
 */
domUtil.getBaseUri = (doc) => {
    return doc.querySelector('html > head > base').getAttribute('href');
};

/**
 * Gets the title of the current page from a Parsoid document. This title string usually differs
 * from normalized titles in that it has spaces replaced with underscores.
 * Example: given a Parsoid document with
 * <link rel="dc:isVersionOf" href="//en.wikipedia.org/wiki/Hope_(painting)"/> and
 * <base href="//en.wikipedia.org/wiki/"/> this function returns the string 'Hope_(painting)'.
 * @param {!Document} doc Parsoid DOM document
 */
domUtil.getParsoidLinkTitle = (doc) => {
    const href = doc.querySelector('html > head > link[rel="dc:isVersionOf"]').getAttribute('href');
    const baseUri = domUtil.getBaseUri(doc);
    return decodeURIComponent(href.replace(new RegExp(`^${baseUri}`), ''));
};

module.exports = domUtil;
