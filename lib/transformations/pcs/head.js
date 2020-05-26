'use strict';

const url = require('url');
const apiConstants = require('../../api-util-constants');

const dom = require('../../domUtil');

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
 * <link rel="stylesheet" href="https://meta.wikimedia.org/api/rest_v1/data/css/mobile/base">
 * <link rel="stylesheet" href="https://meta.wikimedia.org/api/rest_v1/data/css/mobile/pcs">
 * <link rel="stylesheet" href="https://en.wikipedia.org/api/rest_v1/data/css/mobile/site">
 * @param {Document} document DOM document
 * @param {!object} options options object with the following properties:
 *   {!string} baseURI base URI for common links
 */
function addCssLinks(document, options) {
    const headEl = document.head;
    let hostname = options.domain;
    if (!hostname) {
        const baseUri = dom.getHttpsBaseUri(document);
        if (baseUri) {
            hostname = url.parse(baseUri).hostname;
        }
    }
    if (headEl) {
        headEl.appendChild(createStylesheetLinkElement(document,
            `${options.baseURI}data/css/mobile/base`));
        if (hostname) {
            const localRestApiBaseUri =
                apiConstants.getExternalRestApiUri(hostname);
            headEl.appendChild(createStylesheetLinkElement(document,
                `${localRestApiBaseUri}data/css/mobile/site`));
        }
        headEl.appendChild(createStylesheetLinkElement(document,
            `${options.baseURI}data/css/mobile/pcs`));
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
    el.setAttribute('content',
        'width=device-width, user-scalable=no, initial-scale=1, shrink-to-fit=no');
    return el;
}

/**
 * Adds the viewport meta element to html/head/
 * <meta name="viewport"
 *  content="width=device-width, user-scalable=no, initial-scale=1, shrink-to-fit=no" />
 * @param {Document} document DOM document
 */
function addMetaViewport(document) {
    const headEl = document.head;
    if (headEl) {
        headEl.appendChild(createMetaViewportElement(document));
    }
}

function addMetaTags(document, meta) {
    const head = document.head;
    if (!head) {
        return;
    }
    const protections = meta.mw.protection;
    protections.forEach((protection) => {
        const meta = document.createElement('meta');
        meta.setAttribute('property', `mw:pageProtection:${protection.type}`);
        meta.setAttribute('content', protection.level);
        head.appendChild(meta);
    });
    const originalimage = meta.mw.originalimage;
    if (originalimage) {
        const meta = document.createElement('meta');
        meta.setAttribute('property', 'mw:leadImage');
        meta.setAttribute('content', originalimage.source);
        meta.setAttribute('data-file-width', originalimage.width);
        meta.setAttribute('data-file-height', originalimage.height);
        head.appendChild(meta);
    }
}

/**
 * Adds the script element to html/head/
 * <script src=http://localhost:8888/meta.wikimedia.org/v1/data/javascript/mobile/pagelib></script>
 * @param {Document} document DOM document
 * @param {!object} options options object with the following properties:
 *   {!string} baseURI base URI for common links
 */
function createScriptElement(document, options) {
    const el = document.createElement('script');
    el.setAttribute('src', `${options.baseURI}data/javascript/mobile/pcs`);
    return el;
}

/**
 * Adds Javascript needed to use and trigger the page library client side functionality.
 * A reference to the actual JS file bundle from the wikimedia-page-library is added to the head.
 * A short inline script to trigger the loading of the lazy loaded images since the mobile-html
 * only contains the placeholders but not the image elements for the bigger images on a page.
 * @param {Document} document DOM document
 * @param {!object} options options object with the following properties:
 *   {!string} baseURI base URI for common links
 */
function addPageLibJs(document, options) {
    const headEl = document.head;
    if (headEl) {
        headEl.appendChild(createScriptElement(document, options));
    }
    const bodyEl = document.getElementById('pcs');
    if (bodyEl) {
      const sections = bodyEl.querySelectorAll('section');
      if (sections.length > 0) {
        const startScript = document.createElement('script');
        /* DOM sink status: safe - content not from user input */
        startScript.innerHTML = 'pcs.c1.Page.onBodyStart();';
        bodyEl.insertBefore(startScript, sections[0]);
        for (var i = 1; i < sections.length; i++) {
          sections[i].style.display = 'none';
        }
      }
      const endScript = document.createElement('script');
      endScript.setAttribute('defer', 'true');
      /* DOM sink status: safe - content not from user input */
      endScript.innerHTML = 'pcs.c1.Page.onBodyEnd();';
      bodyEl.appendChild(endScript);
    }
}

/**
 * Adds <link rel="icon" href="data:,"> tag to the document. This prevents
 * (at least on Android) requests for the site's favicon. We don't need that
 * on the apps.
 * @param {!Document} document DOM document
 */
function avoidFaviconRequest(document) {
    const head = document.head;
    if (!head) {
        return;
    }
    const link = document.createElement('link');
    link.setAttribute('rel', 'icon');
    link.setAttribute('href', 'data:,');
    /* DOM sink status: safe - content not from user input */
    head.appendChild(link);
}

/**
 * Adds pcs:locale meta tag to the document. The tag is used by the
 * client side JS to pick the correct locale for localizing strings
 * @param {Document} document DOM document
 * @param {!string} locale string for the locale used for localization
 */
function addLocale(document, locale) {
    if (!locale) {
        return;
    }
    const head = document.head;
    if (!head) {
        return;
    }
    const meta = document.createElement('meta');
    meta.setAttribute('property', 'pcs:locale');
    meta.setAttribute('content', locale);
    /* DOM sink status: safe - content transform with no user interference */
    head.appendChild(meta);
}

/**
 * Gets the meta tag content attribute value for a given property from a Parsoid HTML Document
 * @param {Document} document Parsoid HTML document
 * @param {string} property meta property to get
 * @return {?string} meta element's content property value or undefined
 */
function getMetaTagContent(document, property) {
    const headTag = document.head;
    if (!headTag) {
      return undefined;
    }
    const metaTag = headTag.querySelector(`meta[property="${property}"]`);
    if (!metaTag) {
      return undefined;
    }
    return metaTag.getAttribute('content');
}

/**
 * Gets the page namespace from a parsoid document
 * @param {Document} document Parsoid HTML document
 * @return {?integer} namespace
 */
function getPageNamespace(document) {
    const contentString = getMetaTagContent(document, 'mw:pageNamespace');
    if (contentString === undefined) {
        return undefined;
    }
    return parseInt(contentString);
}

/**
 * Gets whether or not the page is a main page from a parsoid document
 * @param {Document} document Parsoid HTML document
 * @return {?boolean} isMainPage
 */
function getIsMainPage(document) {
    return getMetaTagContent(document, 'isMainPage') === 'true';
}

module.exports = {
    addCssLinks,
    addMetaViewport,
    addPageLibJs,
    addMetaTags,
    avoidFaviconRequest,
    addLocale,
    getIsMainPage,
    getPageNamespace
};
