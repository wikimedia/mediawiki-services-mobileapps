'use strict';

const mUtil = require('./mobile-util');
const mwapi = require('./mwapi');
const parsoid = require('./parsoid-access');
const transforms = require('./transforms');
const wikiLanguage = require('./wikiLanguage');
const preprocessParsoidHtml = require('./processing');

/**
 * @param {!Document} doc
 * @return {!Array} list of TOC entries
 */
function buildTocEntries(doc) {
    const sections = doc.querySelectorAll('section');
    const result = [];
    const levelCounts = new Array(10).fill(0);
    let lastLevel = 0;

    [].forEach.call(sections, section => {
        const id = parseInt(section.getAttribute('data-mw-section-id'));
        if (id < 1) {
            return;
        }
        const headerEl = section.firstChild;
        const level = parseInt(headerEl.tagName.charAt(1)) - 1;
        if (level < lastLevel) {
            levelCounts.fill(0, level);
        }
        lastLevel = level;
        levelCounts[level - 1]++;
        result.push({
            level: level,
            section: id,
            number: levelCounts.slice(0, level).map(n => n.toString()).join('.'),
            anchor: headerEl.getAttribute('id'),
            html: headerEl.innerHTML.trim()
        });
    });
    return result;
}

/**
 * Extract and return structured TOC info from Parsoid HTML
 *
 * @param {!Document} doc
 * @param {!Object} siteinfo site info from MW API
 * @return {!Object} structured table of contents
 */
function buildTableOfContents(doc, siteinfo) {
    return {
        title: siteinfo.general.toctitle,
        entries: buildTocEntries(doc),
    };
}

/**
 * Augment language links with additional information for the response.
 *
 * @param {?Array} langlinks langlinks from MW API
 * @param {!string} domain request domain
 * @param {!Object} siteinfo siteinfo from MW API
 * @return {?Array} augmented language links
 */
function augmentLangLinks(langlinks, domain, siteinfo) {
    if (!langlinks || langlinks.filter(ll => ll.title === '').length) {
        return;
    }
    return langlinks.map((ll) => {
        const llDomain = mUtil.domainForLangCode(domain, ll.lang);
        const dbTitle = mwapi.getDbTitle(ll.title, siteinfo);
        return {
            lang: ll.lang,
            summary_url: `https://${llDomain}/api/rest_v1/page/summary/${dbTitle}`,
            titles: {
                canonical: mwapi.getDbTitle(ll.title, siteinfo),
                normalized: ll.title
            },
        };
    });
}

/**
 * Augment categories with additional information for the response.
 *
 * @param {?Array} categories page categories from MW API
 * @param {!string} domain request domain
 * @param {!Object} siteinfo siteinfo from MW API
 * @return {?Array} augmented categories
 */
function augmentCategories(categories, domain, siteinfo) {
    if (!categories) {
        return;
    }
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
 *
 * @param {!Object} req the request object
 * @param {!Object} htmlResponse raw Parsoid page HTML response
 * @param {!Object} meta page metadata from the MW API
 * @param {!Object} si site info from MW API
 * @param {!Array} processing metadata processing script
 * @return {!Object} the metadata response object
 */
function buildMetadata(req, htmlResponse, meta, si, processing) {
    const domain = req.params.domain;
    const lang = wikiLanguage.getLanguageCode(domain);
    const revTid = parsoid.getRevAndTidFromEtag(htmlResponse.headers);
    return mUtil.createDocument(htmlResponse.body)
    .then(doc => preprocessParsoidHtml(doc, processing))
    .then((doc) => {
        return {
            revision: revTid.revision,
            tid: revTid.tid,
            hatnotes: transforms.extractHatnotesForMetadata(doc, lang),
            issues: transforms.extractPageIssuesForMetadata(doc),
            toc: buildTableOfContents(doc, si),
            language_links: augmentLangLinks(meta.langlinks, domain, si),
            categories: augmentCategories(meta.categories, domain, si),
            protection: meta.protection,
            description_source: meta.description_source,
        };
    });
}

module.exports = {
    buildMetadata,
    testing: {
        buildTocEntries,
        augmentLangLinks,
        augmentCategories,
    }
};
