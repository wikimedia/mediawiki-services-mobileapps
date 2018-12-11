/**
 * Accessing Parsoid output
 */

'use strict';

const mUtil = require('./mobile-util');
const api = require('./api-util');
const parseProperty = require('./parseProperty');
const parsoidSections = require('./sections/parsoidSections');
const preprocessParsoidHtml = require('./processing');
const transforms = require('./transforms');

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
    const restReq = { headers: {
        accept: mUtil.getContentTypeString(spec),
        'accept-language': req.headers['accept-language']
    } };
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
    // eslint-disable-next-line max-len
    return _getRestPageContent(app, req, 'mobile-sections-lead', mUtil.CONTENT_TYPES.mobileSections);
}

/**
 * Retrieves the etag from the headers if present. Strips the weak etag prefix (W/) and enclosing
 * quotes.
 * @param {?Object} headers an object of header name/values
 * @return {?string} etag
 */
function getEtagFromHeaders(headers) {
    if (headers && headers.etag) {
        return headers.etag.replace(/^W\//, '').replace(/"/g, '');
    }
}

/**
 * Retrieves the revision from the etag emitted by Parsoid.
 * @param {?Object} headers an object of header name/values
 * @return {?string} revision portion of etag, if found
 */
function getRevisionFromEtag(headers) {
    const etag = getEtagFromHeaders(headers);
    if (etag) {
        return etag.split('/').shift();
    }
}

/**
 * Retrieves the revision and tid from the etag emitted by Parsoid.
 * @param {?Object} headers an object of header name/values
 * @return {?Object} revision and tid from etag, if found
 */
function getRevAndTidFromEtag(headers) {
    const etag = getEtagFromHeaders(headers);
    if (etag) {
        const etagComponents = etag.split('/');
        return {
            revision: etagComponents[0],
            tid: etagComponents[1]
        };
    }
}

/**
 * <meta property="dc:modified" content="2015-10-05T21:35:32.000Z"/>
 * @param {!Document} doc Parsoid DOM document
 */
function getModified(doc) {
    return doc.querySelector('head > meta[property="dc:modified"]').getAttribute('content')
        .replace(/\.000Z$/, 'Z');
}

/**
 * <meta property="dc:modified" content="2015-10-05T21:35:32.000Z"/>
 * @param {!string} html Parsoid HTML string
 */
function getModifiedFromHtml(html) {
    return `${html.match(/<meta[^>]*?property="dc:modified"[^>]*?\/>/i)[0]
        .match(/content="(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}).\d{3}Z"/i)[1]}Z`;
}

/**
 * @param {!Object} app the application object
 * @param {!Object} req the request object
 * @return {!promise} Returns a promise to retrieve the page content from Parsoid
 */
function pageJsonPromise(app, req) {
    return getParsoidHtml(app, req)
        .then((response) => {
            const page = getRevAndTidFromEtag(response.headers);
            return mUtil.createDocument(response.body)
            .then((doc) => {
                // Note: these properties must be obtained before stripping markup
                page.lastmodified = getModified(doc);
                page.pronunciation = parseProperty.parsePronunciation(doc);
                page.spoken = parseProperty.parseSpokenWikipedia(doc);
                page.hatnotes = transforms.extractHatnotesForMobileSections(doc);
                page.issues = transforms.extractPageIssuesForMobileSections(doc);
                page._headers = {
                    'Content-Language': response.headers && response.headers['content-language'],
                    Vary: response.headers && response.headers.vary
                };
                return preprocessParsoidHtml(doc, app.conf.processing_scripts['mobile-sections'])
                .then((doc) => {
                    page.sections = parsoidSections.getSectionsText(doc, req.logger);
                    return page;
                });
            });
        });
}

/**
 * @param {!Object} app the application object
 * @param {!Object} req the request object
 * @param {?boolean} [optimized] if true will apply additional transformations
 * to reduce the payload
 * @return {!promise} Returns a promise to retrieve the page content from Parsoid
 */
function pageHtmlPromise(app, req, optimized) {
    return getParsoidHtml(app, req)
        .then((response) => {
            const meta = getRevAndTidFromEtag(response.headers);
            meta._headers = {
                'Content-Language': response.headers && response.headers['content-language'],
                Vary: response.headers && response.headers.vary
            };
            return mUtil.createDocument(response.body)
            .then((doc) => {
                if (optimized) {
                    return preprocessParsoidHtml(doc, app.conf.processing_scripts['mobile-html'])
                    .then((doc) => {
                        return { meta, html: doc.outerHTML };
                    });
                }
                return { meta, html: doc.outerHTML };
            });
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
            meta._headers = {
                'Content-Language': response.headers && response.headers['content-language'],
                Vary: response.headers && response.headers.vary
            };
            return mUtil.createDocument(response.body)
            .then(doc => preprocessParsoidHtml(doc, app.conf.processing_scripts.references))
            .then((doc) => {
                return { meta, doc };
            });
        });
}

module.exports = {
    pageJsonPromise,
    pageHtmlPromise,
    pageHtmlPromiseForReferences,
    getParsoidHtml,
    getMobileSectionsLead,
    getRevisionFromEtag,
    getRevAndTidFromEtag,
    getModified,
    getModifiedFromHtml,

    // VisibleForTesting
    getEtagFromHeaders
};
