/**
 * Accessing Parsoid output
 */

'use strict';

const domino = require('domino');
const sUtil = require('./util');
const mUtil = require('./mobile-util');
const api = require('./api-util');
const parseProperty = require('./parseProperty');
const parseDefinitions = require('./definitions/parseDefinitions');
const parsoidSections = require('./sections/parsoidSections');
const transforms = require('./transforms');
const HTTPError = sUtil.HTTPError;


/**
 * Generic function to get page content from the REST API.
 * @param {!Object} app the application object
 * @param {!Object} req the request object
 * @param {!string} endpoint the content desired, e.g., 'html', 'mobile-sections'
 * @return {!promise} Promise for the requested content
 */
function _getRestPageContent(app, req, endpoint, spec) {
    const rev = req.params.revision;
    let suffix = '';
    if (rev) {
        suffix = `/${rev}`;
        const tid = req.params.tid;
        if (tid) {
            suffix += `/${tid}`;
        }
    }
    const domain = req.params.domain.replace(/^(\w+\.)m\./, '$1');
    const path = `page/${endpoint}/${encodeURIComponent(req.params.title)}${suffix}`;
    const restReq = { headers: { accept: mUtil.getContentTypeString(spec) } };
    return api.restApiGet(app, domain, path, restReq);
}

/**
 * @param {!Object} app the application object
 * @param {!Object} req the request object
 * @return {!promise} Promise for the raw Parsoid HTML of the given page/rev/tid
 */
function getParsoidHtml(app, req) {
    return _getRestPageContent(app, req, 'html', mUtil.CONTENT_TYPES.html);
}

/**
 * @param {!Object} app the application object
 * @param {!Object} req the request object
 * @return {!promise} Promise for the mobile-sections-lead response for the given page/rev/tid
 */
function getMobileSectionsLead(app, req) {
    return _getRestPageContent(app, req, 'mobile-sections-lead', mUtil.CONTENT_TYPES.mobileSections); // eslint-disable-line max-len
}

/**
 * Retrieves the revision from the etag emitted by Parsoid.
 * Note it currently has an extra double quote at the beginning and at the end.
 * @param {?object} headers an object of header name/values
 * @return {?*}
 */
function getRevisionFromEtag(headers) {
    let revision;
    if (headers && headers.etag) {
        revision = headers.etag.split('/').shift();
        revision = revision.replace(/^"/, '');
        // Uncomment the following line if you need to see tid values from Parsoid in the console:
        // console.log(`headers.etag = ${headers.etag}`);
    }
    return revision;
}

function getRevAndTidFromEtag(headers) {
    if (headers && headers.etag) {
        const etagComponents = headers.etag.replace(/"/g, '').split('/');
        return {
            revision: etagComponents[0],
            tid: etagComponents[1]
        };
    }
}

/**
 * <meta property="dc:modified" content="2015-10-05T21:35:32.000Z"/>
 * @param {!document} doc
 */
function getModified(doc) {
    return doc.querySelector('head > meta[property="dc:modified"]').getAttribute('content')
        .replace(/\.000Z$/, 'Z');
}

/**
 * Gets the base URI from a Parsoid document
 * <base href="//en.wikipedia.org/wiki/"/>
 * @param {!document} doc
 */
function getBaseUri(doc) {
    return doc.querySelector('html > head > base').getAttribute('href');
}

/**
 * Gets the title of the current page from a Parsoid document. This title string usually differs
 * from normalized titles in that it has spaces replaced with underscores.
 * Example: given a Parsoid document with
 * <link rel="dc:isVersionOf" href="//en.wikipedia.org/wiki/Hope_(painting)"/> and
 * <base href="//en.wikipedia.org/wiki/"/> this function returns the string 'Hope_(painting)'.
 * @param {!document} doc
 */
function getParsoidLinkTitle(doc) {
    const href = doc.querySelector('html > head > link[rel="dc:isVersionOf"]').getAttribute('href');
    const baseUri = getBaseUri(doc);
    return decodeURIComponent(href.replace(new RegExp(`^${baseUri}`), ''));
}

/**
 * @param {!Object} app the application object
 * @param {!Object} req the request object
 * @param {?Boolean} [legacy] if enabled will apply additional transformations
 * including a legacy version of relocation of first paragraph
 * and hiding IPA via an inline style rather than clas.
 * @return {!promise} Returns a promise to retrieve the page content from Parsoid
 */
function pageJsonPromise(app, req, legacy) {
    return getParsoidHtml(app, req)
        .then((response) => {
            const page = getRevAndTidFromEtag(response.headers);
            const doc = domino.createDocument(response.body);

            // Note: these properties must be obtained before stripping markup
            page.lastmodified = getModified(doc);
            page.pronunciation = parseProperty.parsePronunciation(doc);
            page.spoken = parseProperty.parseSpokenWikipedia(doc);
            page.hatnotes = transforms.extractHatnotesForMobileSections(doc, !legacy);
            page.issues = transforms.extractPageIssuesForMobileSections(doc, !legacy);

            if (legacy) {
                transforms.shortenPageInternalLinks(doc, getParsoidLinkTitle(doc));
                transforms.addRequiredMarkup(doc);
                transforms.flattenElements(doc, 'sup.mw-ref', [ 'class', 'id' ]);
            }
            transforms.stripUnneededMarkup(doc, legacy);
            transforms.stripUnwantedWikiContentForApp(doc, legacy);

            page.sections = parsoidSections.getSectionsText(doc, req.logger);
            return page;
        });
}

/**
 * @param {!Object} app the application object
 * @param {!Object} req the request object
 * @param {?Boolean} [optimized] if true will apply additional transformations
 * to reduce the payload
 * @return {!promise} Returns a promise to retrieve the page content from Parsoid
 */
function pageHtmlPromise(app, req, optimized) {
    return getParsoidHtml(app, req)
        .then((response) => {
            const meta = getRevAndTidFromEtag(response.headers);
            const doc = domino.createDocument(response.body);

            if (optimized) {
                transforms.stripReferenceListContent(doc);
                transforms.stripUnneededMarkup(doc, false);
                transforms.stripUnwantedWikiContentForApp(doc, false);
            }

            const html = doc.outerHTML;
            return { meta, html };
        });
}

/**
 * @param {!Object} app the application object
 * @param {!Object} req the request object
 * @return {!promise} Returns a promise to retrieve the page content from Parsoid
 */
function pageHtmlPromiseForReferences(app, req) {
    return getParsoidHtml(app, req)
        .then((response) => {
            const meta = getRevAndTidFromEtag(response.headers);
            const doc = domino.createDocument(response.body);

            transforms.stripUnneededReferenceMarkup(doc);
            return { meta, doc };
        });
}

/**
 * @param {!Object} app the application object
 * @param {!Object} req the request object
 * @return {!promise} a promise to retrieve a set of definitions from Wiktionary.
 */
function definitionPromise(app, req) {
    if (req.params.domain.indexOf('wiktionary.org') === -1) {
        throw new HTTPError({
            status: 400,
            type: 'invalid_domain',
            title: 'Invalid domain',
            detail: 'Definition requests only supported for wiktionary.org domains.'
        });
    }
    if (req.params.domain.indexOf('en') !== 0) {
        throw new HTTPError({
            status: 501,
            type: 'unsupported_language',
            title: 'Language not supported',
            detail: 'The language you have requested is not yet supported.'
        });
    }
    return getParsoidHtml(app, req)
        .then((response) => {
            const doc = domino.createDocument(response.body);
            transforms.stripUnneededMarkup(doc);
            transforms.stripUnwantedWikiContentForApp(doc, true);
            transforms.stripWiktionarySpecificMarkup(doc);
            transforms.rmElementsWithSelector(doc, 'sup');
            transforms.addRequiredMarkup(doc);
            return {
                payload: parseDefinitions(doc, req.params.domain, req.params.title),
                meta: {
                    revision: getRevisionFromEtag(response.headers)
                }
            };
        });
}

module.exports = {
    pageJsonPromise,
    pageHtmlPromise,
    pageHtmlPromiseForReferences,
    definitionPromise,
    getParsoidHtml,
    getMobileSectionsLead,
    getRevisionFromEtag,
    getRevAndTidFromEtag,
    getModified,

    // VisibleForTesting
    _getBaseUri: getBaseUri,
    _getParsoidLinkTitle: getParsoidLinkTitle,
};
