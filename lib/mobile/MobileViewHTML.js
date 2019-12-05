const TEXT_DIRECTION = 'ltr';

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
    const normalizedtitle = options.meta && options.meta.normalizedtitle;

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
    isVersionOf.setAttribute('href', `//${options.domain}/wiki/${normalizedtitle}`);
    head.appendChild(isVersionOf);

    head.querySelector('title').innerHTML = page.displaytitle;

    const base = document.createElement('base');
    base.setAttribute('href', `//${options.domain}/wiki/`);
    head.appendChild(base);
}

function wrapImagesInFigureElements(document) {
    Array.from(document.querySelectorAll('a.image')).forEach((imageLink) => {
        const figureElement = document.createElement('figure');
        figureElement.className = 'mw-default-size';
        figureElement.innerHTML = imageLink.outerHTML;
        imageLink.parentNode.replaceChild(figureElement, imageLink);
    });
}

function createHeadingHTML(document, section) {
    const level = section.toclevel + 1;
    return `<h${level} id="${section.anchor}">${section.line}</h${level}>`;
}

function buildSection(document, section) {
    const element = document.createElement('section');
    element.setAttribute('data-mw-section-id', section.id);
    if (section.id === 0) {
        element.setAttribute('id', 'content-block-0');
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

/**
 * Scan the DOM for reference lists and wrap them in a div to be closer to the Parsoid DOM.
 * @param {!Document} document
 */
function wrapReferenceListsLikeParsoid(document) {
    let mwtCounter = 1000;
    const refLists = document.querySelectorAll('ol.references');
    for (const refList of refLists) {
        // add the mw-references class
        refList.classList.add('mw-references');

        // wrap in inner DIV
        const wrapInner = document.createElement('DIV');
        wrapInner.classList.add('mw-references-wrap');
        wrapInner.setAttribute('typeof', 'mw:Extension/references');
        wrapInner.setAttribute('about', `#mwt${mwtCounter++}`);
        refList.parentNode.replaceChild(wrapInner, refList);
        wrapInner.appendChild(refList);
    }
}

/**
 * Creates a Parsoid document from the MobileView response
 * @param {!Document} document DOM document to insert into
 * @param {!object} mobileview name of the meta property
 * @param {!object} options value of the meta property
 * @return {void}
 */
function convertToParsoidDocument(document, mobileview, options) {
    addParsoidHead(document, options);

    const content = document.body;

    // add dir property T229984
    content.setAttribute('dir', TEXT_DIRECTION);

    for (const section of mobileview.sections) {
        content.appendChild(buildSection(document, section));
    }

    rewriteWikiLinks(content, 'a', 'href');
    wrapImagesInFigureElements(document);
    wrapReferenceListsLikeParsoid(document);
    return document;
}

module.exports = {
    convertToParsoidDocument,
    testing: {
        buildSection,
        rewriteWikiLinks,
        wrapImagesInFigureElements,
    }
};
