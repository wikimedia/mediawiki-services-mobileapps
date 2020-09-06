'use strict';

const P = require('bluebird');
const mUtil = require('./mobile-util');
const parsoid = require('./parsoid-access');
const mwapi = require('./mwapi');
const preprocessParsoidHtml = require('./processing');
const parsoidSections = require('./sections/parsoidSections');
const transforms = require('./transforms');

const NS_MAIN = 0;
const SUMMARY_NS_ALLOWLIST = [ NS_MAIN ];
const EMPTY_EXTRACTS = { extract: '', extract_html: '' };

/**
 * Builds a dictionary containing the various forms of a page title that a client may need.
 *
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
    const encodedTitle = encodeURIComponent(canonicalTitle);
    return {
        desktop: {
            page: `https://${domain}/wiki/${encodedTitle}`,
            revisions: `https://${domain}/wiki/${encodedTitle}?action=history`,
            edit: `https://${domain}/wiki/${encodedTitle}?action=edit`,
            talk: meta.talkNsText && `https://${domain}/wiki/${encodeURIComponent(meta.talkNsText)}:${encodeURIComponent(titleObj.getKey())}`
        },
        mobile: mobileBaseUrl && {
            page: `${mobileBaseUrl}/wiki/${encodedTitle}`,
            revisions: `${mobileBaseUrl}/wiki/Special:History/${encodedTitle}`,
            edit: `${mobileBaseUrl}/wiki/${encodedTitle}?action=edit`,
            talk: meta.talkNsText && `${mobileBaseUrl}/wiki/${encodeURIComponent(meta.talkNsText)}:${encodeURIComponent(titleObj.getKey())}`
        }
    };
}

/**
 * @param {!Object} meta page metadata from MW API
 * return {!boolean} true if empty extracts should be returned, false otherwise
 */
function shouldReturnEmptyExtracts(meta) {
    return !(SUMMARY_NS_ALLOWLIST.includes(meta.ns))
        || meta.mainpage
        || meta.redirect
        || meta.contentmodel !== 'wikitext';
}

/**
 * Gets the page summary type.
 *
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
 *
 * @param {!string} html Parsoid HTML for the page
 * @param {!Object} meta page metadata from the MediaWiki API
 * @param {!Array} processing the summary processing script
 * @return {!Promise <Object {extract, extract_html}>} promise resolving to the extract values
 */
function buildExtracts(html, meta, processing) {
    if (shouldReturnEmptyExtracts(meta)) {
        return P.resolve(EMPTY_EXTRACTS);
    } else {
        return parsoidSections.createDocumentFromLeadSection(html)
        .then(doc => preprocessParsoidHtml(doc, processing))
        .then((doc) => {
            const intro = transforms.extractLeadIntroduction(doc);
            return intro.length ? transforms.summarize.summarize(intro) : EMPTY_EXTRACTS;
        });
    }
}

/**
 * Build a page summary
 *
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
    const titleObj = mwapi.getTitleObj(title, siteinfo);
    return buildExtracts(html, meta, processing)
    .then(extracts => Object.assign({
        code: 200,
        type: getSummaryType(meta),
        title: meta.normalizedtitle,
        displaytitle: meta.displaytitle,
        namespace: { id: meta.ns, text: meta.nsText },
        wikibase_item: meta.pageprops && meta.pageprops.wikibase_item,
        titles: buildTitlesDictionary(titleObj, meta),
        pageid: meta.id,
        thumbnail: meta.thumbnail,
        originalimage: meta.originalimage,
        lang: meta.lang,
        dir: meta.dir,
        revision: revTid.revision,
        tid: revTid.tid,
        timestamp: parsoid.getModifiedFromHtml(html),
        description: meta.description,
        description_source: meta.description_source,
        coordinates: meta.geo && {
            lat: meta.geo.latitude,
            lon: meta.geo.longitude
        },
        content_urls: buildContentUrls(titleObj, domain, meta)
    }, extracts));
}

module.exports = {
    buildSummary,
    testing: {
        buildExtracts,
        getSummaryType
    }
};
