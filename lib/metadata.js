'use strict';

const domino = require('domino');
const mUtil = require('./mobile-util');
const mwapi = require('./mwapi');
const parsoid = require('./parsoid-access');
const transforms = require('./transforms');
const getSectionsText = require('./sections/parsoidSections').getSectionsText;

const TOC_DEPTH_LIMIT = 10;

/**
 * @param {!Array} sections list of section objects from getSectionsText
 * @return {!Array} list of TOC entries
 */
function buildTocEntries(sections) {
    const result = [];
    const levelCounts = new Array(TOC_DEPTH_LIMIT).fill(0);
    let lastLevel = 0;
    sections.filter(s => s.id > 0 && (s.toclevel && s.toclevel < TOC_DEPTH_LIMIT)).forEach((s) => {
        if (s.toclevel < lastLevel) {
            levelCounts.fill(0, s.toclevel);
        }
        lastLevel = s.toclevel;
        levelCounts[s.toclevel - 1]++;
        result.push({
            level: s.toclevel,
            section: s.id,
            number: levelCounts.slice(0, s.toclevel).map(n => n.toString()).join('.'),
            anchor: s.anchor,
            html: s.line
        });
    });
    return result;
}

/**
 * Extract and return structured TOC info from Parsoid HTML
 * @param {!Object} sections page sections from parsoidSections.getSectionsText
 * @param {!Object} siteinfo site info from MW API
 * @return {!Object} structured table of contents
 */
function buildTableOfContents(sections, siteinfo) {
    return {
        title: siteinfo.general.toctitle,
        entries: buildTocEntries(sections),
    };
}

function augmentLangLinks(langlinks, domain, siteinfo) {
    return langlinks.map((ll) => {
        const llDomain = mUtil.domainForLangCode(domain, ll.lang);
        const dbTitle = mwapi.getDbTitle(ll.title, siteinfo);
        return Object.assign(ll, {
            summary_url: `https://${llDomain}/api/rest_v1/page/summary/${dbTitle}`,
            titles: {
                canonical: mwapi.getDbTitle(ll.title, siteinfo),
                normalized: ll.title
            },
            title: undefined
        });
    });
}

function augmentCategories(categories, domain, siteinfo) {
    return categories.map((cat) => {
        const dbTitle = mwapi.getDbTitle(cat.title, siteinfo);
        return Object.assign(cat, {
            summary_url: `https://${domain}/api/rest_v1/page/summary/${dbTitle}`,
            titles: {
                canonical: mwapi.getDbTitle(cat.title, siteinfo),
                normalized: cat.title,
                display: cat.title.slice(cat.title.indexOf(':') + 1),
            },
            title: undefined
        });
    });
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
        toc: buildTableOfContents(sections, siteinfo),
        language_links: augmentLangLinks(meta.langlinks, req.params.domain, siteinfo),
        categories: augmentCategories(meta.categories, req.params.domain, siteinfo),
        protection: meta.protection
    };
}

module.exports = {
    buildMetadata,
    testing: {
        buildTocEntries
    }
};
