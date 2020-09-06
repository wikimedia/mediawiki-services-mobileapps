'use strict';

const domUtil = {};

/**
 * Returns true if the nearest ancestor to the given element has a class set for Right-to-Left mode,
 * false otherwise.
 *
 * @param {!Element} element a DOM element
 * @return {!boolean}
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
 *
 * @param {!Document} doc Parsoid DOM document
 * @return {?string} Example: '//en.wikipedia.org/wiki/' or undefined
 */
domUtil.getBaseUri = (doc) => {
    const base = doc.head.querySelector('base');
    return base && base.getAttribute('href');
};

/**
 * Gets the absolute https base URI from a Parsoid document
 * <base href="//en.wikipedia.org/wiki/"/>
 *
 * @param {!Document} doc Parsoid DOM document
 * @return {?string} Example: 'https://en.wikipedia.org/wiki/' or undefined
 */
domUtil.getHttpsBaseUri = (doc) => {
    const baseUri = domUtil.getBaseUri(doc);
    return baseUri && baseUri.startsWith('http') ? baseUri : `https:${baseUri}`;
};

/**
 * Gets the plain, normalized title of the current page from a Parsoid document. This title string
 * may have spaces but no HTML tags.
 * Example: given a Parsoid document with
 * <title>Wreck-It Ralph</title>
 *
 * @param {!Document} doc Parsoid DOM document
 * @return {?string} normalized title or undefined
 */
domUtil.getParsoidPlainTitle = (doc) => {
    const title = doc.head.querySelector('title');
    return title && title.textContent;
};

/**
 * Gets the title of the current page from a Parsoid document. This title string usually differs
 * from normalized titles in that it has spaces replaced with underscores.
 * Example: given a Parsoid document with
 * <link rel="dc:isVersionOf" href="//en.wikipedia.org/wiki/Hope_(painting)"/> and
 * <base href="//en.wikipedia.org/wiki/"/> this function returns the string 'Hope_(painting)'.
 *
 * @param {!Document} doc Parsoid DOM document
 * @return {?string} Example: 'Hope_(painting)' or undefined
 */
domUtil.getParsoidLinkTitle = (doc) => {
    const link = doc.head.querySelector('link[rel="dc:isVersionOf"]');
    if (!link) {
        return;
    }
    const href = link.getAttribute('href');
    const baseUri = domUtil.getBaseUri(doc);
    const title = href.replace(baseUri, '');
    try {
        return decodeURIComponent(title);
    } catch (e) {
        // Update the error message to include the faulty base URI (T240274)
        e.message = `${e.message}: ${title}`;
        throw e;
    }
};

module.exports = domUtil;
