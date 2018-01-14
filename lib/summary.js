'use strict';

const domino = require('domino');
const parsoid = require('./parsoid-access');
const parsoidSections = require('./parsoidSections');
const transforms = require('./transforms');

const NS_MAIN = 0;
const SUMMARY_NS_WHITELIST = [ NS_MAIN ];

/**
 * Builds a dictionary containing the various forms of a page title that a client may need.
 * @param {!Object} title a mediawiki-title Title object constructed from a page title string
 * @param {!Object} meta page metadata
 * @return {!Object} a set of useful page title strings
 */
function buildTitleDictionary(title, meta) {
    return {
        canonical: title.getPrefixedDBKey(),
        normalized: meta.normalizedtitle,
        display: meta.displaytitle,
    };
}

/**
 * Get the page summary type.
 * @param {!Object} meta page metadata from MW API
 * return {!String} the summary type (one of 'standard', 'disambiguation', or 'mainpage')
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
    return 'standard';
}

function buildContentUrls(domain, title, meta) {
    const mobileBaseUrl = meta.mobileHost;
    return {
        desktop: {
            page: `https://${domain}/wiki/${title.getPrefixedDBKey()}`,
            revisions: `https://${domain}/wiki/${title.getPrefixedDBKey()}?action=history`,
            edit: `https://${domain}/wiki/${title.getPrefixedDBKey()}?action=edit`,
            talk: meta.talkNsText && `https://${domain}/wiki/${meta.talkNsText}:${title.getKey()}`
        },
        mobile: mobileBaseUrl && {
            page: `${mobileBaseUrl}/wiki/${title.getPrefixedDBKey()}`,
            revisions: `${mobileBaseUrl}/wiki/Special:History/${title.getPrefixedDBKey()}`,
            edit: `${mobileBaseUrl}/wiki/${title.getPrefixedDBKey()}?action=edit`,
            talk: meta.talkNsText && `${mobileBaseUrl}/wiki/${meta.talkNsText}:${title.getKey()}`
        }
    };
}

function buildApiUrls(domain, title, meta) {
    return {
        summary: `https://${domain}/api/rest_v1/page/summary/${title.getPrefixedDBKey()}`,
        // read_html: `https://${domain}/api/rest_v1/page/read-html/${title.getPrefixedDBKey()}`,
        // content_html: `https://${domain}/api/rest_v1/page/content-html/${title.getPrefixedDBKey()}`,
        // metadata: `https://${domain}/api/rest_v1/page/metadata/${title.getPrefixedDBKey()}`,
        // references: `https://${domain}/api/rest_v1/page/references/${title.getPrefixedDBKey()}`,
        // media: `https://${domain}/api/rest_v1/page/media/${title.getPrefixedDBKey()}`,
        edit_html: `https://${domain}/api/rest_v1/page/html/${title.getPrefixedDBKey()}`,
        talk_page_html: meta.talkNsText && `https://${domain}/api/rest_v1/page/html/${meta.talkNsText}:${title.getKey()}`
    };
}

/*
 * Build a page summary
 * @param {!String} domain the request domain
 * @param {!Object} title a mediawiki-title object for the page title
 * @param {!String} html page content and metadata from Parsoid
 * @param {!Object} revTid revision and tid from Parsoid
 * @param {!Object} meta metadata from MW API
 * @return {!Object} a summary 2.0 spec-compliant page summary object
 */
function buildSummary(domain, title, html, revTid, meta) {
    const isContentModelWikitext = meta.contentmodel === 'wikitext';
    const isWhiteListedNamespace = SUMMARY_NS_WHITELIST.includes(meta.ns);
    const isRedirect = meta.redirect;

    if (!isContentModelWikitext) {
        return { code: 204 };
    }

    if (!isWhiteListedNamespace) {
        return { code: 204 };
    }

    if (isRedirect) {
        return { code: 204 };
    }

    const doc = domino.createDocument(html);
    const leadSectionDoc = parsoidSections.justLeadSection(doc);
    const intro = transforms.extractLeadIntroduction(leadSectionDoc);
    const summary = intro.length ? transforms.summarize(intro) : { extract: '', extract_html: '' };

    return Object.assign({
        code: 200,
        type : getSummaryType(meta),
        title: meta.normalizedtitle,
        displaytitle: meta.displaytitle,
        namespace: { id: meta.ns, text: meta.nsText },
        titles: buildTitleDictionary(title, meta),
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
        content_urls: buildContentUrls(domain, title, meta),
        api_urls: buildApiUrls(domain, title, meta),
    }, summary);
}

module.exports = {
    buildSummary,
    testing: {
        getSummaryType
    }
};
