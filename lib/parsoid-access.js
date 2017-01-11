/**
 * Accessing Parsoid output
 */

'use strict';

const domino = require('domino');
const a = require('./anchorencode');
const sUtil = require('./util');
const api = require('./api-util');
const parseSection = require('./parseSection');
const parseProperty = require('./parseProperty');
const parseDefinition = require('./parseDefinition');
const transforms = require('./transforms');
const HTTPError = sUtil.HTTPError;


/**
 * @param {Object} app the application object
 * @param {Object} req the request object
 * @return {promise} a Promise, which if fulfilled, will return the Parsoid content
 *          of the given page.
 */
function getParsoidHtml(app, req) {
    const rev = req.params.revision;
    let suffix = '';
    if (rev) {
        suffix =  `/${rev}`;
    }
    const domain = req.params.domain.replace(/^(\w+\.)m\./, '$1');
    const path = `page/html/${encodeURIComponent(req.params.title)}${suffix}`;
    const restReq = {
        query: { redirect: 'false' },
        headers: { accept: 'text/html; charset=utf-8; profile="mediawiki.org/specs/html/1.2.0"' }
    };

    return api.restApiGet(app, domain, path, restReq);
}

/**
 * @param {document} doc the parsed DOM Document of the Parsoid output
 * @return {document} the DOM document with added Section divs
 */
function addSectionDivs(doc) {
    // TODO: update once Parsoid emits section tags, see https://phabricator.wikimedia.org/T114072#1711063
    let i = 0;
    let output;
    let sectionDiv;
    const node = doc.body.firstChild;

    sectionDiv = doc.createElement('div');
    sectionDiv.id = `section_${i}`;
    sectionDiv.className = 'toclevel_1';
    output = parseSection(sectionDiv, node);
    i++;

    if (output.nextNode) {
        doc.body.insertBefore(output.sectionDiv, output.nextNode);
    } else {
        doc.body.appendChild(output.sectionDiv);
    }

    while (output.nextNode) {
        const section = output.nextSection;
        sectionDiv = doc.createElement('div');
        sectionDiv.id = `section_${i}`;
        sectionDiv.className = `toclevel_${section.toclevel}`;
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
    const sections = [];
    const sectionDivs = doc.querySelectorAll('div[id^=section]');

    for (let i = 0; i < sectionDivs.length; i++) {
        const currentSection = {};
        const currentSectionDiv = sectionDivs[i];
        currentSection.id = i;
        currentSection.text = currentSectionDiv.innerHTML;

        if (i !== 0) {
            const className = currentSectionDiv.className;
            currentSection.toclevel = parseInt(className.substring('toclevel_'.length));
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
    let revision;
    if (headers && headers.etag) {
        revision = headers.etag.split('/').shift();
        revision = revision.replace(/^"/, '');
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
 * @param {Boolean} [legacy] if enabled will apply additional transformations
 * including a legacy version of relocation of first paragraph
 * and hiding IPA via an inline style rather than clas.
 * @return {promise} Returns a promise to retrieve the page content from Parsoid
 */
function pageContentPromise(app, req, legacy) {
    return getParsoidHtml(app, req)
        .then((response) => {
            const page = { revision: getRevisionFromEtag(response.headers) };
            const doc = domino.createDocument(response.body);

            // Note: these properties must be obtained before stripping markup
            page.lastmodified = getModified(doc);
            parseProperty.parseGeo(doc, page);
            parseProperty.parseSpokenWikipedia(doc, page);

            transforms.stripUnneededMarkup(doc, legacy);
            addSectionDivs(doc);
            transforms.addRequiredMarkup(doc);

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
            transforms.stripWiktionarySpecificMarkup(doc);
            transforms.rmElementsWithSelector(doc, 'sup');
            addSectionDivs(doc);
            transforms.addRequiredMarkup(doc);
            return {
                payload: parseDefinition(doc, req.params.domain, req.params.title),
                meta: {
                    revision: getRevisionFromEtag(response.headers)
                }
            };
        });
}

module.exports = {
    pageContentPromise,
    definitionPromise,
    getParsoidHtml,
    getRevisionFromEtag,

    // VisibleForTesting
    _addSectionDivs: addSectionDivs,
    _getSectionsText: getSectionsText,
};
