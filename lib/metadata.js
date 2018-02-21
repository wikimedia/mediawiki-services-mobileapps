'use strict';

const domino = require('domino');
const parsoid = require('./parsoid-access');
const transforms = require('./transforms');
const parseSpoken = require('./parseProperty').parseSpokenWikipedia;
const getSectionsText = require('./sections/parsoidSections').getSectionsText;

const MAX_TOC_DEPTH = 10;

/**
 * Extract and return structured TOC info from Parsoid HTML
 * @param {!Object} sections page sections from parsoidSections.getSectionsText
 * @param {!Object} siteinfo site info from MW API
 * @return {!Object} structured table of contents
 */
function buildTableOfContents(sections, siteinfo) {
    const entries = [];
    const levelCounts = new Array(MAX_TOC_DEPTH).fill(0);
    let lastLevel = 0;
    sections.filter(s => s.id > 0 && (s.toclevel && s.toclevel <= MAX_TOC_DEPTH)).forEach((s) => {
        if (s.toclevel < lastLevel) {
            levelCounts.fill(0, s.toclevel);
        }
        lastLevel = s.toclevel;
        levelCounts[s.toclevel - 1]++;
        entries.push({
            toclevel: s.toclevel,
            tocsection: s.id,
            tocnumber: levelCounts.slice(0, s.toclevel).map(n => n.toString()).join('.'),
            href: s.anchor,
            html: s.line
        });
    });
    return {
        title: siteinfo.general.toctitle,
        entries
    };
}

/**
 * Builds the metadata endpoint response.
 * @param {!Object} req the request object
 * @param {!Object} htmlResponse raw Parsoid page HTML response
 * @param {!Object} meta page metadata from the MW API
 * @param {!Object} siteinfo site info from MW API
 * @return {!Object} the metadata response object
 */
function buildMetadata(req, htmlResponse, meta, siteinfo) {
    const doc = domino.createDocument(htmlResponse.body);
    transforms.stripUnneededMetadataMarkup(doc);
    const sections = getSectionsText(doc, req.logger);
    const revTid = parsoid.getRevAndTidFromEtag(htmlResponse.headers);
    return {
        revision: revTid.revision,
        tid: revTid.tid,
        hatnotes: transforms.extractHatnotesForMetadata(doc),
        issues: transforms.extractPageIssuesForMetadata(doc),
        spoken: parseSpoken(doc),
        toc: buildTableOfContents(sections, siteinfo),
        categories: meta.categories,
        coordinates: meta.coordinates,
        protection: meta.protection
    };
}

module.exports = {
    buildMetadata,
    testing: {
        buildTableOfContents
    }
};
