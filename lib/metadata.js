'use strict';

const domino = require('domino');
const parsoid = require('./parsoid-access');
const transforms = require('./transforms');
const parseSpoken = require('./parseProperty').parseSpokenWikipedia;
const getSectionsText = require('./sections/parsoidSections').getSectionsText;

const TOCLIMIT_REGEX = /^toclimit-(\d+)$/;
const DEFAULT_TOC_LIMIT = 10;

/**
 * Get the toclimit value from the .toclimit div, if present.
 * @param {!doc} doc
 * @return {?integer} the toclimit value from the doc, if any
 */
function getTocLimit(doc) {
    const tocLimitDiv = doc.querySelector('div[class*=toclimit-]');
    if (tocLimitDiv) {
        // Do this the hard way, in case there are other class names in the div's classList.
        const matches = [].filter.call(tocLimitDiv.classList, c => c.match(TOCLIMIT_REGEX));
        if (matches.length) {
            return parseInt(TOCLIMIT_REGEX.exec(matches[0])[1], 10);
        }
    }
}

/**
 * Gets an list of flags affecting TOC depth or visibility ('notoc', 'forcetoc', and/or
 * 'toclimit-n' where 'n' is the depth limit), empty if none are present.
 * @param {!doc} doc
 * @return {!Object} object containing information affecting TOC depth or visibility
 */
function getTocFlags(doc) {
    const result = {};
    if (doc.querySelector('meta[property=mw:PageProp/forcetoc]')) {
        result.forcetoc = true;
    } else if (doc.querySelector('meta[property=mw:PageProp/notoc]')) {
        result.notoc = true;
        return result;
    }
    const toclimit = getTocLimit(doc);
    if (toclimit) {
        result.toclimit = toclimit;
    }
    return result;
}

/**
 * @param {!Array} sections list of section objects from getSectionsText
 * @param {!Object} flags flags affecting the output, including zero or more of 'notoc',
 *   'forcetoc', and 'toclimit'
 * @return {!Array} list of TOC entries
 */
function buildTocEntries(sections, flags) {
    const result = [];
    const limit = flags.toclimit || DEFAULT_TOC_LIMIT;
    const levelCounts = new Array(limit).fill(0);
    let lastLevel = 0;
    sections.filter(s => s.id > 0 && (s.toclevel && s.toclevel < limit)).forEach((s) => {
        if (s.toclevel < lastLevel) {
            levelCounts.fill(0, s.toclevel);
        }
        lastLevel = s.toclevel;
        levelCounts[s.toclevel - 1]++;
        result.push({
            toclevel: s.toclevel,
            tocsection: s.id,
            tocnumber: levelCounts.slice(0, s.toclevel).map(n => n.toString()).join('.'),
            href: s.anchor,
            html: s.line
        });
    });
    return result;
}

/**
 * Extract and return structured TOC info from Parsoid HTML
 * @param {!Object} sections page sections from parsoidSections.getSectionsText
 * @param {!Object} siteinfo site info from MW API
 * @param {!Object} flags zero or more of [ 'notoc', 'forcetoc', 'toclimit' ] and their values
 * @return {!Object} structured table of contents
 */
function buildTableOfContents(sections, siteinfo, flags) {
    return {
        title: siteinfo.general.toctitle,
        entries: buildTocEntries(sections, flags),
        flags
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
        toc: buildTableOfContents(sections, siteinfo, getTocFlags(doc)),
        langlinks: meta.langlinks,
        categories: meta.categories,
        coordinates: meta.coordinates,
        protection: meta.protection
    };
}

module.exports = {
    buildMetadata,
    testing: {
        getTocLimit,
        getTocFlags,
        buildTocEntries
    }
};
