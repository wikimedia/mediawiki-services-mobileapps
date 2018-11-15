'use strict';

const domino = require('domino');
const parsoid = require('./parsoid-access');
const mwapi = require('./mwapi');
const parsoidSections = require('./sections/parsoidSections');
const transforms = require('./transforms');

const NS_MAIN = 0;
const SUMMARY_NS_WHITELIST = [ NS_MAIN ];
const EMPTY_EXTRACTS = { extract: '', extract_html: '' };

/**
 * Builds a dictionary containing the various forms of a page title that a client may need.
 * @param {!Object} titleObj a mediawiki-title Title object constructed from a page title string
 * @param {!Object} meta page metadata
 * @return {!Object} a set of useful page title strings
 */
function buildTitlesDictionary(titleObj, meta) {
    return {
        canonical: titleObj.getPrefixedDBKey(),
        normalized: meta.normalizedtitle,
        display: meta.displaytitle,
    };
}

function buildContentUrls(titleObj, domain, meta) {
    const mobileBaseUrl = meta.mobileHost;
    const canonicalTitle = titleObj.getPrefixedDBKey();
    return {
        desktop: {
            page: `https://${domain}/wiki/${canonicalTitle}`,
            revisions: `https://${domain}/wiki/${canonicalTitle}?action=history`,
            edit: `https://${domain}/wiki/${canonicalTitle}?action=edit`,
            talk: meta.talkNsText && `https://${domain}/wiki/${meta.talkNsText}:${titleObj.getKey()}`
        },
        mobile: mobileBaseUrl && {
            page: `${mobileBaseUrl}/wiki/${canonicalTitle}`,
            revisions: `${mobileBaseUrl}/wiki/Special:History/${canonicalTitle}`,
            edit: `${mobileBaseUrl}/wiki/${canonicalTitle}?action=edit`,
            talk: meta.talkNsText && `${mobileBaseUrl}/wiki/${meta.talkNsText}:${titleObj.getKey()}`
        }
    };
}

function buildApiUrls(titleObj, domain, meta) {
    const canonicalTitle = titleObj.getPrefixedDBKey();
    return {
        summary: `https://${domain}/api/rest_v1/page/summary/${canonicalTitle}`,
        // mobile_html: `https://${domain}/api/rest_v1/page/mobile-html/${canonicalTitle}`,
        metadata: `https://${domain}/api/rest_v1/page/metadata/${canonicalTitle}`,
        references: `https://${domain}/api/rest_v1/page/references/${canonicalTitle}`,
        media: `https://${domain}/api/rest_v1/page/media/${canonicalTitle}`,
        edit_html: `https://${domain}/api/rest_v1/page/html/${canonicalTitle}`,
        talk_page_html: meta.talkNsText && `https://${domain}/api/rest_v1/page/html/${meta.talkNsText}:${titleObj.getKey()}`
    };
}

/**
 * @param {!Object} meta page metadata from MW API
 * return {!boolean} true if empty extracts should be returned, false otherwise
 */
function shouldReturnEmptyExtracts(meta) {
    return !(SUMMARY_NS_WHITELIST.includes(meta.ns))
        || meta.mainpage
        || meta.redirect
        || meta.contentmodel !== 'wikitext';
}

/**
 * Gets the page summary type.
 * @param {!Object} meta page metadata from MW API
 * return {!String} the summary type (one of 'no-extract', 'standard', 'disambiguation', or
 *      'mainpage')
 */
function getSummaryType(meta) {
    const isDisambiguationPage = meta.pageprops
        && {}.hasOwnProperty.call(meta.pageprops, 'disambiguation');
    if (meta.mainpage) {
        return 'mainpage';
    }
    if (isDisambiguationPage) {
        return 'disambiguation';
    }
    if (shouldReturnEmptyExtracts(meta)) {
        return 'no-extract';
    }
    return 'standard';
}

/**
 * Builds the extract values.
 * @param {!Document} doc a DOM Document with the lead section content
 * @param {!Object} meta page metadata from the MediaWiki API
 * @param {!Array} processing the summary processing script
 * @return {!Object {extract, extract_html} } the extract values
 */
function buildExtracts(doc, meta, processing) {
    if (shouldReturnEmptyExtracts(meta)) {
        return EMPTY_EXTRACTS;
    } else {
        transforms.preprocessParsoidHtml(doc, processing);
        const intro = transforms.extractLeadIntroduction(doc);
        if (intro.length) {
            return transforms.summarize.summarize(intro);
        } else {
            return EMPTY_EXTRACTS;
        }
    }
}

/**
 * Build a page summary
 * @param {!string} domain the request domain
 * @param {!Object} title the request title
 * @param {!string} html page content and metadata from Parsoid
 * @param {!Object} revTid revision and tid from Parsoid
 * @param {!Object} meta metadata from MW API
 * @param {!Object} siteinfo siteinfo from the MW API
 * @param {!Array} processing summary processing script
 * @return {!Object} a summary 2.0 spec-compliant page summary object
 */
function buildSummary(domain, title, html, revTid, meta, siteinfo, processing) {
    const doc = domino.createDocument(html);
    const leadSectionDoc = parsoidSections.justLeadSection(doc);
    const extracts = buildExtracts(leadSectionDoc, meta, processing);
    const titleObj = mwapi.getTitleObj(title, siteinfo);
    return Object.assign({
        code: 200,
        type: getSummaryType(meta),
        title: meta.normalizedtitle,
        displaytitle: meta.displaytitle,
        namespace: { id: meta.ns, text: meta.nsText },
        titles: buildTitlesDictionary(titleObj, meta),
        pageid: meta.id,
        thumbnail: meta.thumbnail,
        originalimage: meta.originalimage,
        lang: meta.lang,
        dir: meta.dir,
        revision: revTid.revision,
        tid: revTid.tid,
        timestamp: parsoid.getModified(doc),
        description: meta.description,
        coordinates: meta.geo && {
            lat: meta.geo.latitude,
            lon: meta.geo.longitude
        },
        content_urls: buildContentUrls(titleObj, domain, meta),
        api_urls: buildApiUrls(titleObj, domain, meta),
    }, extracts);
}

module.exports = {
    buildSummary,
    testing: {
        buildExtracts,
        getSummaryType
    }
};
