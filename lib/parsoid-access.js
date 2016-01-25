/**
 * Accessing Parsoid output
 */

'use strict';

var preq = require('preq');
var domino = require('domino');
var sUtil = require('../lib/util');
var mwapi = require('./mwapi');
var parseSection = require('./parseSection');
var parseProperty = require('./parseProperty');
var parseDefinition = require('./parseDefinition');
var transforms = require('./transforms');
var HTTPError = sUtil.HTTPError;

var REDIRECT_REGEXP = /<link rel="mw:PageProp\/redirect" href="\.\/([^"]+)"/;

var MAX_REDIRECTS = 10;

/**
 * Check if there is a redirect in the Parsoid response header.
 *
 * @param {object} response the Parsoid response to check for redirects
 * @return {boolean} true if there is a redirect target or false if there is not.
 */
function hasRedirectResponseStatus(response) {
    return ((response.status === 301 || response.status === 302)
        && response.headers && response.headers.location);
}

/**
 * Gets the redirected title from the Parsoid response header 'Location'.
 * Note: this assumes that hasRedirectResponseStatus returns true.
 *
 * @param {object} response the Parsoid response to check for redirects
 * @return {string} the title of the redirect target or empty string.
 */
function getRedirectTitleFromLocationHeader(response) {
    // only take what's after the last '/'
    return response.headers.location.split('/').pop();
}

/**
 * Check if there is a redirect in the Parsoid payload.
 *
 * @param {string} body the Parsoid response body to check for redirects
 * @return {boolean} true if there is a redirect target or false if there is not.
 */
function hasRedirectInPayload(body) {
    return REDIRECT_REGEXP.test(body);
}

/**
 * Gets the redirected title from the Parsoid payload.
 * Note: this assumes that hasRedirectInPayload returns true.
 *
 * @param {string} body the Parsoid response body to check for redirects
 * @return {string} the title of the redirect target or empty string.
 */
function getRedirectTitleFromPayload(body) {
    return REDIRECT_REGEXP.exec(body)[1];
}

/**
 * @param {Logger} logger the logger instance to use
 * @param {string} restbase_uri the base URI for restbase as configured
 * @param {string} domain the wikipedia domain (e.g. "en.wikipedia.org")
 * @param {string} title the article title
 * @param {int, optional} revision the revision of the page to request
 * @param {Object, optional} opts additional options:
 *        {int} redirects the number of redirects left, default: MAX_REDIRECTS
 *        {Object} orig the original request domain and title
 * @return {promise} a Promise, which if fulfilled, will return the Parsoid content of the given page.
 */
function getContent(logger, restbase_uri, domain, title, revision, opts) {
    var uri = restbase_uri + '/' + domain.replace(/^(\w+\.)m\./, '$1')
        + '/v1/page/html/' + encodeURIComponent(title);
    if (!opts && revision && revision.constructor === Object) {
        opts = revision;
        revision = undefined;
    }
    if (revision) {
        uri = uri + '/' + revision;
    }
    opts = opts || {
        redirects: MAX_REDIRECTS,
        orig: {
            domain: domain,
            title: title
        }
    };
    if (!opts.redirects) {
        throw new HTTPError({
            status: 400,
            type: 'bad_request',
            title: 'Too many redirects',
            detail: opts.orig
        });
    }
    opts.redirects--;
    return preq.get({
        uri: uri
    }).then(function(response) {
        mwapi.checkResponseStatus(response);
        if (hasRedirectResponseStatus(response)) {
            return getContent(logger, restbase_uri, domain, getRedirectTitleFromLocationHeader(response), null, opts);
        } else if (hasRedirectInPayload(response.body)) {
            return getContent(logger, restbase_uri, domain, getRedirectTitleFromPayload(response.body), null, opts);
        } else {
            return response;
        }
    });
}

/**
 * @param {document} doc the parsed DOM Document of the Parsoid output
 * @return {sections[]} an array of section JSON elements
 */
function getSectionsText(doc) {
    // TODO: update once Parsoid emits section tags, see https://phabricator.wikimedia.org/T114072#1711063
    var sections = [],
        section,
        output,
        i = 0,
        node = doc.body.firstChild;

    output = parseSection(node);
    sections.push({
        "id": 0,
        "text": output.text
    });

    while (output.nextNode) {
        section = output.nextSection;
        i++;
        output = parseSection(output.nextNode);
        section.id = i;
        section.text = output.text;
        sections.push(section);
    }

    return sections;
}

/**
 * Retrieves the revision from the etag emitted by Parsoid.
 * Note it currently has an extra double quote at the beginning and at the end.
 * @param headers
 * @returns {*}
 */
function getRevisionFromEtag(headers) {
    var revision;
    if (headers && headers.etag) {
        revision = headers.etag.split(/\//).shift();
        revision = revision.replace(/^\"/, '');
    }
    return revision;
}

/**
 * <meta property="dc:modified" content="2015-10-05T21:35:32.000Z"/>
 */
function getModified(doc) {
    return doc.querySelector('head > meta[property="dc:modified"]').getAttribute('content')
        .replace(/\.000Z$/, 'Z');
}

/** Returns a promise to retrieve the page content from Parsoid */
function pageContentPromise(logger, restbase_uri, domain, title, revision) {
    return getContent(logger, restbase_uri, domain, title, revision)
        .then(function (response) {
            var page = { revision: getRevisionFromEtag(response.headers) };
            var doc = domino.createDocument(response.body);
            page.lastmodified = getModified(doc);
            parseProperty.parseGeo(doc, page);
            parseProperty.parseSpokenWikipedia(doc, page);
            transforms.runParsoidDomTransforms(doc);

            page.sections = getSectionsText(doc);
            return page;
        });
}

/** Returns a promise to retrieve a set of definitions parsed from Wiktionary Parsoid HTML,
    or throws 501 if requesting from an unsupported Wiktionary domain. */
function definitionPromise(logger, restbase_uri, domain, term, revision) {
    if (domain.indexOf('wiktionary.org') === -1) {
        throw new sUtil.HTTPError({
            status: 400,
            type: 'invalid_domain',
            title: 'Invalid domain',
            detail: 'Definition requests only supported for wiktionary.org domains.'
        });
    }
    if (domain.indexOf('en') !== 0) {
        throw new sUtil.HTTPError({
            status: 501,
            type: 'unsupported_language',
            title: 'Language not supported',
            detail: 'The language you have requested is not yet supported.'
        });
    }
    return getContent(logger, restbase_uri, domain, term, revision)
        .then(function (response) {
            var doc = domino.createDocument(response.body);
            transforms.runParsoidDomTransforms(doc);
            return parseDefinition(doc, domain, term);
        });
}

module.exports = {
    pageContentPromise: pageContentPromise,
    definitionPromise: definitionPromise,

    // VisibleForTesting
    _getSectionsText: getSectionsText,
    _getRedirectTitleFromLocationHeader: getRedirectTitleFromLocationHeader,
    _hasRedirectInPayload: hasRedirectInPayload
};
