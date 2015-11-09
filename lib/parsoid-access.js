'use strict';
/**
 Accessing Parsoid output
 */

var preq = require('preq');
var domino = require('domino');
var sUtil = require('../lib/util');
var a = require('./anchorencode');
var mwapi = require('./mwapi');
var parse = require('./parseProperty');
var transforms = require('./transforms');
var HTTPError = sUtil.HTTPError;

var REDIRECT_REGEXP = /<link rel="mw:PageProp\/redirect" href="\.\/([^"]+)"/;

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
 * @return {promise} a Promise, which if fulfilled, will return the Parsoid content of the given page.
 */
function getContent(logger, restbase_uri, domain, title, revision) {
    var uri = restbase_uri + '/' + domain.replace(/^(\w+\.)m\./, '$1')
        + '/v1/page/html/' + encodeURIComponent(title);
    if (revision) {
        uri = uri + '/' + revision;
    }
    return preq.get({
        uri: uri
    }).then(function(response) {
        mwapi.checkResponseStatus(response);
        if (hasRedirectResponseStatus(response)) {
            return getContent(logger, restbase_uri, domain, getRedirectTitleFromLocationHeader(response));
        } else if (hasRedirectInPayload(response.body)) {
            return getContent(logger, restbase_uri, domain, getRedirectTitleFromPayload(response.body));
        } else {
            return response;
        }
    });
}

function _collectSection(startingNode) {
    var node = startingNode,
        text = '',
        nextSection = {};
    while (node) {
        if (node.nodeType === transforms.NodeType.TEXT) {
            text = text + node.nodeValue;
            node = node.nextSibling;
            continue;
        } else if (/^H[2-6]$/.test(node.tagName)) { // heading tag
            nextSection.toclevel = parseInt(node.tagName.charAt(1)) - 1;
            nextSection.line = node.innerHTML.trim();
            nextSection.anchor = a.anchorencode(nextSection.line);
            node = node.nextSibling;
            break;
        }

        if (node.outerHTML) { // had some "undefined" values creeping into the output without this check
            text = text + node.outerHTML;
        }
        node = node.nextSibling;
    }
    return { text: text.trim(), nextNode: node, nextSection: nextSection};
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

    output = _collectSection(node);
    sections.push({
        "id": 0,
        "text": output.text
    });

    while (output.nextNode) {
        section = output.nextSection;
        i++;
        output = _collectSection(output.nextNode);
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
            parse.parseGeo(doc, page);
            parse.parseSpokenWikipedia(doc, page);
            transforms.runParsoidDomTransforms(doc);

            page.sections = getSectionsText(doc);
            return page;
        });
}

module.exports = {
    pageContentPromise: pageContentPromise,

    // VisibleForTesting
    _getSectionsText: getSectionsText,
    _getRedirectTitleFromLocationHeader: getRedirectTitleFromLocationHeader,
    _hasRedirectInPayload: hasRedirectInPayload
};
