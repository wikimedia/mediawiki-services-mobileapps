'use strict';

/**
 * Adds a single link to a CSS stylesheet to html/head
 * @param {Document} document DOM document
 * @param {string} cssLink the link to the stylesheet
 * @return {Element} DOM Element
 */
function createStylesheetLinkElement(document, cssLink) {
    const linkEl = document.createElement('link');
    linkEl.setAttribute('rel', 'stylesheet');
    linkEl.setAttribute('href', cssLink);
    return linkEl;
}

/**
 * Adds links to the PCS CSS stylesheets to html/head/.
 * Example:
 * <link rel="stylesheet" href="https://en.wikipedia.org/api/rest_v1/data/css/mobile/base">
 * <link rel="stylesheet" href="https://en.wikipedia.org/api/rest_v1/data/css/mobile/site">
 * @param {Document} document DOM document
 * @param {string} baseUri the baseUri ending with a slash for the RESTBase API
 */
function addCssLinks(document, baseUri) {
    const headEl = document.querySelector('html > head');
    if (headEl) {
        headEl.appendChild(createStylesheetLinkElement(document, `${baseUri}data/css/mobile/base`));
        headEl.appendChild(createStylesheetLinkElement(document, `${baseUri}data/css/mobile/site`));
    }
}

/**
 * Creates a single <meta> element setting the viewport for a mobile device.
 * @param {Document} document DOM document
 * @return {Element} DOM Element
 */
function createMetaViewportElement(document) {
    const el = document.createElement('meta');
    el.setAttribute('name', 'viewport');
    el.setAttribute('content', 'width=device-width, user-scalable=no');
    return el;
}

/**
 * Adds the viewport meta element to html/head/
 * <meta name="viewport" content="width=device-width, user-scalable=no" />
 * @param {Document} document DOM document
 */
function addMetaViewport(document) {
    const headEl = document.querySelector('html > head');
    if (headEl) {
        headEl.appendChild(createMetaViewportElement(document));
    }
}

module.exports = {
    addCssLinks,
    addMetaViewport
};
