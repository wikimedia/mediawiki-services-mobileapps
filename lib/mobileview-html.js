'use strict';

const wikiLanguage = require('./wikiLanguage');
const preprocessHtml = require('./processing');
const addPageHeader = require('./transformations/pcs/addPageHeader');
const wrapReferenceListsLikeParsoid
    = require('./transformations/references/wrapReferenceListsLikeParsoid');

const BBPromise = require('bluebird');
const domino = require('domino');
const mwapi = require('./mwapi');
const uuid = require('cassandra-uuid').TimeUuid;

const TEXT_DIRECTION = 'ltr';

function shouldUseMobileview(req) {
    return wikiLanguage.getLanguageCode(req.params.domain) === 'zh';
}

/**
 * Creates a single meta element with property and content
 * @param {!Document} document DOM document
 * @param {!string} property name of the meta property
 * @param {!string} content value of the meta property
 * @return {void}
 */
function createMetaElement(document, property, content) {
    const element = document.createElement('meta');
    element.setAttribute('property', property);
    element.setAttribute('content', content);
    return element;
}

/**
 * Adds a single link to a CSS stylesheet to html/head
 * @param {Document} document DOM document
 * @param {!object} options options object with the following properties:
 *   {?string} baseURI base URI for common links
 *   {?string} domain domain name of wiki
 *   {?object} mobileview response body from action=mobileview
 * @return {void}
 */
function addParsoidHead(document, options) {
    const page = options.mobileview;
    if (page) {
        document.documentElement.setAttribute('about',
            `http://${options.domain}/wiki/Special:Redirect/revision/${page.revision}`);
    }

    const charset = document.createElement('meta');
    charset.setAttribute('charset', 'utf-8');

    const head = document.head;
    if (!head) {
      return;
    }

    head.appendChild(createMetaElement(document, 'mw:pageNamespace', page.ns));
    head.appendChild(createMetaElement(document, 'mw:pageId', page.id));
    head.appendChild(createMetaElement(document, 'dc:modified', page.lastmodified));

    const isVersionOf = document.createElement('link');
    isVersionOf.setAttribute('rel', 'dc:isVersionOf');
    isVersionOf.setAttribute('href', `//${options.domain}/wiki/${page.normalizedtitle}`);
    head.appendChild(isVersionOf);

    head.querySelector('title').innerHTML = page.displaytitle;

    const base = document.createElement('base');
    base.setAttribute('href', `//${options.domain}/wiki/`);
    head.appendChild(base);
}

function createHeadingHTML(document, section) {
    const level = section.toclevel + 1;
    return `<h${level} id="${section.anchor}">${section.line}</h${level}>`;
}

function buildSection(document, section) {
    const element = document.createElement('section');
    element.setAttribute('data-mw-section-id', section.id);
    if (section.id === 0) {
        element.setAttribute('id', 'content_block_0');
        element.innerHTML = section.text;
    } else {
        element.innerHTML = `${createHeadingHTML(document, section)}${section.text}`;
    }
    return element;
}

/**
 * Opposite of rewriteUrlAttribute
 */
function rewriteWikiLinks(element, selector, ...attributes) {
    const ps = element.querySelectorAll(selector) || [];
    for (let idx = 0; idx < ps.length; idx++) {
        const node = ps[idx];
        attributes.forEach((attribute) => {
            let value = node.getAttribute(attribute);
            if (value) {
                value = value.replace(/^\/wiki\//, './');
                node.setAttribute(attribute, value);
            }
        });
    }
}

function wrapImagesInFigureElements(document) {
    Array.from(document.querySelectorAll('a.image')).forEach((imageLink) => {
        const figureElement = document.createElement('figure');
        figureElement.className = 'mw-default-size';
        figureElement.innerHTML = imageLink.outerHTML;
        imageLink.parentNode.replaceChild(figureElement, imageLink);
    });
}

function getMeta(req, mwRes) {
    const languageCode = wikiLanguage.getLanguageCode(req.params.domain);
    const isLanguageCodeWithVariants = wikiLanguage.isLanguageCodeWithVariants(languageCode);
    let headers;
    if (isLanguageCodeWithVariants) {
        headers = {
            Vary: 'Accept-Language'
        };
    }
    return BBPromise.resolve({
        revision: mwRes.body.mobileview.revision,
        tid: uuid.now().toString(),
        _headers: headers
    });
}

function buildPage(req, mwResponse, meta, processingScript, options) {
    const mobileview = mwResponse.body.mobileview;
    const document = domino.createDocument('');
    addParsoidHead(document, options);

    // addPageHeader is usually called from a processing script but since we already
    // have the MW API response here that's not necessary anymore.
    // Assumption: empty parsoid.meta ==> no pronunciation support
    addPageHeader(document, { parsoid: { meta: {} }, mw: meta });

    const content = document.body;

    // add dir property T229984
    content.setAttribute('dir', TEXT_DIRECTION);

    for (let section of mobileview.sections) {
        content.appendChild(buildSection(document, section));
    }

    rewriteWikiLinks(content, 'a', 'href');
    wrapImagesInFigureElements(document);
    wrapReferenceListsLikeParsoid(document);

    return BBPromise.props({
        doc: preprocessHtml(document, processingScript, options),
        meta: getMeta(req, mwResponse)
    });
}

function requestAndProcessPage(req, scripts, baseURI) {
    return BBPromise.props({
        mobileview: mwapi.getPageFromMobileview(req),
        mw: mwapi.getMetadataForMobileHtml(req)
    }).then((response) => {
        return buildPage(req, response.mobileview, response.mw, scripts,
            {
                baseURI: baseURI,
                domain: req.params.domain,
                mobileview: response.mobileview.body.mobileview
            }
        );
    });
}

module.exports = {
    requestAndProcessPage,
    shouldUseMobileview,
    testing: {
        buildSection,
        rewriteWikiLinks,
        wrapImagesInFigureElements,
    }
};
