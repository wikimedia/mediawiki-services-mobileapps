/**
 * Accessing Parsoid output
 */

'use strict';

var preq = require('preq');
var domino = require('domino');
var a = require('./anchorencode');
var Template = require('swagger-router').Template;
var sUtil = require('../lib/util');
var mwapi = require('./mwapi');
var parseSection = require('./parseSection');
var parseProperty = require('./parseProperty');
var parseDefinition = require('./parseDefinition');
var relocateFirstParagraph = require('./transformations/relocateFirstParagraph');
var hideDeadLinks = require('../lib/transformations/hideDeadLinks');
var transforms = require('./transforms');
var HTTPError = sUtil.HTTPError;
var BBPromise = require('bluebird');


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
 * @param {Object} app the application object
 * @param {Object} req the request object
 * @return {promise} a Promise, which if fulfilled, will return the Parsoid content of the given page.
 */
function getContent(app, req) {
    var revision = req.params.revision;
    var opts = req.params.opts;
    req.params.domain = req.params.domain.replace(/^(\w+\.)m\./, '$1');

    var request = new Template(app.conf.restbase_req).expand({
        request: req
    });

    if (!opts && revision && revision.constructor === Object) {
        opts = revision;
        revision = undefined;
    }

    opts = opts || {
        redirects: MAX_REDIRECTS,
        orig: {
            domain: req.params.domain,
            title: req.params.title
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

    return preq(request).then(function(response) {
        mwapi.checkResponseStatus(response);
        if (hasRedirectResponseStatus(response)) {
            req.params.title = getRedirectTitleFromLocationHeader(response);
            req.params.revision = undefined;
            return getContent(app, req);
        } else if (hasRedirectInPayload(response.body)) {
            req.params.title = getRedirectTitleFromPayload(response.body);
            req.params.revision = undefined;
            return getContent(app, req);
        } else {
            return response;
        }
    });
}

/**
 * @param {document} doc the parsed DOM Document of the Parsoid output
 * @return {document} the DOM document with added Section divs
 */
function addSectionDivs(doc) {
    // TODO: update once Parsoid emits section tags, see https://phabricator.wikimedia.org/T114072#1711063
    var sections = [],
        section,
        output,
        i = 0,
        sectionDiv,
        node = doc.body.firstChild;

    sectionDiv = doc.createElement('div');
    sectionDiv.id = 'section_' + i;
    sectionDiv.className = 'toclevel_1';
    output = parseSection(sectionDiv, node);
    i++;

    if (output.nextNode) {
        doc.body.insertBefore(output.sectionDiv, output.nextNode);
    } else {
        doc.body.appendChild(output.sectionDiv);
    }

    while (output.nextNode) {
        section = output.nextSection;
        sectionDiv = doc.createElement('div');
        sectionDiv.id = 'section_' + i;
        sectionDiv.className = 'toclevel_' + section.toclevel;
        sectionDiv.title = section.line;
        output = parseSection(sectionDiv, output.nextNode);
        if (output.nextNode) {
            doc.body.insertBefore(output.sectionDiv, output.nextNode);
        } else {
            doc.body.appendChild(output.sectionDiv);
        }
        i++;
    }
}

/**
 * @param {document} doc the parsed DOM Document of the Parsoid output
 * @return {sections[]} an array of section JSON elements
 */
function getSectionsText(doc) {
    // TODO: update once Parsoid emits section tags, see https://phabricator.wikimedia.org/T114072#1711063
    var sections = [],
        currentSection,
        sectionDivs = doc.querySelectorAll('div[id^=section]'),
        currentSectionDiv;

    for (var i = 0; i < sectionDivs.length; i++) {
        currentSection = {};
        currentSectionDiv = sectionDivs[i];
        currentSection.id = i;
        currentSection.text = currentSectionDiv.innerHTML;

        if (i !== 0) {
            currentSection.toclevel = parseInt(currentSectionDiv.className.substring('toclevel_'.length));
            currentSection.line = currentSectionDiv.title;
            currentSection.anchor = a.anchorencode(currentSection.line);
        }

        sections.push(currentSection);
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

/**
 * @param {Object} app: the application object
 * @param {Object} req: the request object
 * @return {promise} Returns a promise to retrieve the page content from Parsoid
 */
function pageContentPromise(app, req) {
    return BBPromise.props({
        content: getContent(app, req),
        deadlinks: mwapi.getDeadLinks(app, req)
    }).then(function (response) {
        var page = { revision: getRevisionFromEtag(response.content.headers) };
        var doc = domino.createDocument(response.content.body);

        // Note: these properties must be obtained before stripping markup
        page.lastmodified = getModified(doc);
        parseProperty.parseGeo(doc, page);
        parseProperty.parseSpokenWikipedia(doc, page);

        if (response.deadlinks.length !== 0) {
            hideDeadLinks(doc, response.deadlinks);
        }

        transforms.stripUnneededMarkup(doc);
        addSectionDivs(doc);
        transforms.addRequiredMarkup(doc);

        // Move the first good paragraph up for any page except main pages.
        // It's ok to do unconditionally since we throw away the page
        // content if this turns out to be a main page.
        //
        // TODO: should we also exclude file and other special pages?
        relocateFirstParagraph(doc);

        page.sections = getSectionsText(doc);
        return page;
    });
}

/*
 * @param {Object} app the application object
 * @param {Object} req the request object
 * @return {promise} a promise to retrieve a set of definitions from Wiktionary.
 */
function definitionPromise(app, req) {
    if (req.params.domain.indexOf('wiktionary.org') === -1) {
        throw new sUtil.HTTPError({
            status: 400,
            type: 'invalid_domain',
            title: 'Invalid domain',
            detail: 'Definition requests only supported for wiktionary.org domains.'
        });
    }
    if (req.params.domain.indexOf('en') !== 0) {
        throw new sUtil.HTTPError({
            status: 501,
            type: 'unsupported_language',
            title: 'Language not supported',
            detail: 'The language you have requested is not yet supported.'
        });
    }
    return getContent(app, req)
        .then(function (response) {
            var doc = domino.createDocument(response.body);
            transforms.stripUnneededMarkup(doc);
            transforms.rmElementsWithSelector(doc, 'sup');
            transforms.inlineSpanText(doc);
            addSectionDivs(doc);
            transforms.addRequiredMarkup(doc);
            return parseDefinition(doc, req.params.domain, req.params.title);
        });
}

module.exports = {
    pageContentPromise: pageContentPromise,
    definitionPromise: definitionPromise,

    // VisibleForTesting
    _addSectionDivs: addSectionDivs,
    _getSectionsText: getSectionsText,
    _getRedirectTitleFromLocationHeader: getRedirectTitleFromLocationHeader,
    _hasRedirectInPayload: hasRedirectInPayload
};
