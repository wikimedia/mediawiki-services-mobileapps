'use strict';

const domino = require('domino');
const underscore = require('underscore');
const uuid = require('cassandra-uuid').TimeUuid;
const HTTPError = require('./util').HTTPError;
const transforms = require('./transforms');
const mUtil = {};

const NS_MAIN = 0;

mUtil.CONTENT_TYPES = {
    mobileSections: { name: 'mobile-sections', version: '0.13.0' },
    media: { name: 'Media', version: '1.0.0' },
    readHtml: { name: 'ReadHtml', version: '0.1.0' },
    summary: { name: 'Summary', version: '1.3.0' },
    definition: { name: 'definition', version: '0.7.2' },
    random: { name: 'random', version: '0.6.0' },
    announcements: { name: 'announcements', version: '0.1.0' },
    compilations: { name: 'compilations', version: '0.1.0' },
    onthisday: { name: 'onthisday', version: '0.3.1' },
    unpublished: { name: 'unpublished', version: '0.0.0' }
};

mUtil.SUMMARY_NS_WHITELIST = [ NS_MAIN ];

mUtil.setContentType = function(res, spec, mainType = 'application/json') {
    if (!spec.name || !spec.version) {
        throw new HTTPError({
            status: 500,
            type: 'invalid_content_type',
            title: 'Only use the allowed content-types',
            detail: `${spec.name}/${spec.version} is not an allowed content-type!`
        });
    }

    res.type(`${mainType}; charset=utf-8; profile="https://www.mediawiki.org/wiki/Specs/${spec.name}/${spec.version}"`);
};

/**
 * Check if a variable is empty.
 * @param {string} val input value
 * @return {!boolean} true if val is null, undefined, an empty object, an empty array, or an empty
 * string.
 */
mUtil.isEmpty = function(val) {
    return !underscore.isNumber(val)
        && !underscore.isBoolean(val)
        && underscore.isEmpty(val);
};

mUtil.isNonempty = underscore.negate(mUtil.isEmpty);

/**
 * @param {*} val input value
 * @param {*} [fallback] the default value to assign if val is empty
 * @return {*} val if nonempty, else fallback.
*/
mUtil.defaultVal = function(val, fallback) {
    return underscore.isEmpty(val) ? fallback : val;
};

/**
 * @param {*} val input value
 * @return {*} val less empty elements.
*/
mUtil.filterEmpty = function(val) {
    if (Array.isArray(val)) {
        return val.map(mUtil.filterEmpty).filter(mUtil.isNonempty);
    }
    if (underscore.isObject(val)) {
        return underscore.pick(underscore.mapObject(val, mUtil.filterEmpty), mUtil.isNonempty);
    }
    return val;
};

/**
 * Sets the ETag header on the response objecti, comprised of the revision ID and
 * the time UUID. If the latter is not given, the current time stamp is used to
 * generate it.
 * @param {!Object}  response the HTTPResponse object on which to set the header
 * @param {?number} revision the revision integer ID to use
 * @param {?string}  tid      the time UUID to use; optional
 */
mUtil.setETag = function(response, revision, tid) {
    // we want to bail out if the revision hasn't been supplied, except
    // in the case revision === 0 because 0 is actually a valid rev_id
    if (!revision && revision !== 0) {
        return;
    }
    if (!tid) {
        tid = uuid.now().toString();
    }
    response.set('etag', `"${revision}/${tid}"`);
};

/**
 * Convert mobile to canonical domain,
 * e.g., 'en.m.wikipedia.org' => 'en.wikipedia.org'
 */
mUtil.mobileToCanonical = function(domain) {
    return domain.replace('.m.', '.');
};

/**
 * Remove the top-level domain from a domain string, e.g., 'en.wikipedia.org' ->
 * 'en.wikipedia'.
 */
mUtil.removeTLD = function(domain) {
    return domain.split('.').slice(0,2).join('.');
};

/**
 * Get the language of the wiki base don the domain name.
 * Example: 'en.wikipedia.org' -> 'en'.
 */
mUtil.getLanguageFromDomain = function(domain) {
    return domain.split('.')[0];
};

mUtil.removeFragment = function(href) {
    if (href.indexOf('#') > -1) {
        return href.substring(0, href.indexOf('#'));
    }
    return href;
};

mUtil.removeLinkPrefix = function(href) {
    return href.replace(/^\.\//, '');
};

mUtil.extractDbTitleFromAnchor = function(anchor) {
    return anchor && mUtil.removeFragment(mUtil.removeLinkPrefix(anchor.getAttribute('href')));
};

/**
 * Merge two arrays of objects by the specified property.  Modifies arr1 in place and preserves its
 * order.
 * @param {?Object[]} arr1 An array of objects
 * @param {?Object[]} arr2 An array of objects
 * @param {!String} prop the property on which to merge the objects in the arrays
 * @param {!Boolean} push whether to extend arr1 with objects from arr2 for which 'prop' is
 * defined but no object in arr1 has the same value
 * Credit: https://jsfiddle.net/guya/eAWKR/.
 */
mUtil.mergeByProp = function(arr1, arr2, prop, push) {
    if (!arr1 || !arr2) {
        return;
    }

    arr2.forEach((arr2obj) => {
        // Find the object in arr1 with the same value of 'prop' as this object in arr2
        const arr1obj = arr1.find(arr1obj => arr1obj[prop] === arr2obj[prop]);

        // If the object already exists, extend it with the new values from
        // arr2, otherwise conditionally add the new object to arr1.
        if (arr1obj) {
            Object.assign(arr1obj, arr2obj);
        } else if (push) {
            arr1.push(arr2obj);
        }
    });
};

mUtil.getRbPageSummaryUrl = function(restbaseTpl, domain, title) {
    const request = restbaseTpl.expand({
        request: {
            params: {
                domain,
                path: `page/summary/${encodeURIComponent(title)}` },
        }
    });
    return request.uri;
};

/**
 * Builds a dictionary containing the various forms of a page title that a client may need.
 * @param {!Object} title a mediawiki-title Title object constructed from a page title string
 * @param {!Object} meta page metadata
 * @return {!Object} a set of useful page title strings
 */
mUtil.buildTitleDictionary = function(title, meta) {
    return {
        canonical: title.getPrefixedDBKey(),
        normalized: meta.normalizedtitle,
        display: meta.displaytitle,
    };
};

/*
 * Build a page summary
 * @param {!String} domain the request domain
 * @param {!Object} title a mediawiki-title object for the page title
 * @param {!Object} pageData raw page data for the page
 * @param {?boolean} disambiguation whether the page is a disambiguation page
 * @return {!Object} a summary 2.0 spec-compliant page summary object
 */
mUtil.buildSummary = function(domain, title, pageData, disambiguation = false) {
    let summary = {};
    const page = pageData.page;
    const meta = pageData.meta;
    const isContentModelWikitext = meta.contentmodel === 'wikitext';
    const isWhiteListedNamespace = mUtil.SUMMARY_NS_WHITELIST.includes(meta.ns);
    const isMainPage = meta.mainpage;
    const isRedirect = meta.redirect;

    if (!isContentModelWikitext) {
        return { code: 204 };
    }

    if (!isWhiteListedNamespace) {
        return { code: 204 };
    }

    if (isMainPage) {
        return { code: 204 };
    }

    if (isRedirect) {
        return { code: 204 };
    }

    const leadText = domino.createDocument(page.sections[0].text);
    const intro = transforms.extractLeadIntroduction(leadText);

    if (intro) {
        summary = transforms.summarize(intro);
    } else {
        // If the lead introduction is empty we should consider it
        // a placeholder e.g. redirect page. To avoid sending an empty
        // summary 204. (T176517)
        return { code: 204 };
    }
    return Object.assign({
        code: 200,
        type : disambiguation ? 'disambiguation' : 'standard',
        title: meta.normalizedtitle,
        displaytitle: meta.displaytitle,
        namespace: { id: meta.ns, text: meta.nsText },
        titles: mUtil.buildTitleDictionary(title, meta),
        pageid: meta.id,
        thumbnail: meta.thumbnail,
        originalimage: meta.originalimage,
        lang: meta.lang,
        dir: meta.dir,
        revision: page.revision,
        tid: page.tid,
        timestamp: meta.lastmodified,
        description: meta.description,
        coordinates: meta.geo && {
            lat: meta.geo.lat,
            lon: meta.geo.lon
        },
        content_urls: mUtil.buildContentUrls(domain, title, meta),
        api_urls: mUtil.buildApiUrls(domain, title, meta),
    }, summary);
};

mUtil.buildContentUrls = function(domain, title, meta) {
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
};

mUtil.buildApiUrls = function(domain, title, meta) {
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
};

mUtil.throw404 = function(message) {
    throw new HTTPError({
        status: 404,
        type: 'not_found',
        title: 'Not found',
        detail: message
    });
};

mUtil.deduplicate = function(array) {
    return Array.from(new Set(array));
};

/* jslint bitwise: true */
/* eslint no-bitwise: ["error", { "allow": ["<<"] }] */
mUtil.hashCode = function(string) {
    return string.split('').reduce((prevHash, currVal) =>
        ((prevHash << 5) - prevHash) + currVal.charCodeAt(0), 0);
};

module.exports = mUtil;
