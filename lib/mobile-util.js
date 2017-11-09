'use strict';

const underscore = require('underscore');
const uuid = require('cassandra-uuid').TimeUuid;
const HTTPError = require('./util').HTTPError;
const transforms = require('./transforms');
const mUtil = {};

const NS_MAIN = 0;

mUtil.CONTENT_TYPES = {
    mobileSections: { name: 'mobile-sections', version: '0.13.0' },
    readHtml: { name: 'ReadHtml', version: '0.1.0' },
    summary: { name: 'Summary', version: '2.0.0' },
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

mUtil.isEnglishWikipedia = function(domain) {
    return (domain === 'en.wikipedia.org' || domain === 'en.wikipedia.beta.wmflabs.org');
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

// Merge two arrays of objects by the specified property.
// Stolen from https://jsfiddle.net/guya/eAWKR/.
mUtil.mergeByProp = function(arr1, arr2, prop, pushIfKeyNotFound) {
    if (!arr1 || !arr2) {
        return;
    }

    arr2.forEach((arr2obj) => {
        const arr1obj = arr1.find((arr1obj) => {
            return arr1obj[prop] === arr2obj[prop];
        });

        // If the object already exists, extend it with the new values from
        // arr2, otherwise conditionally add the new object to arr1.
        if (arr1obj) {
            Object.assign(arr1obj, arr2obj);
        } else if (pushIfKeyNotFound) {
            arr1.push(arr2obj);
        }
    });
};

/**
 * Takes an array of objects and makes the specified changes to the keys of each
 * member object. E.g., adjustMemberKeys(arr, ['to', 'from'], ['to', 'from'], ...)
 * @param {!Array} arr an array of objects that will receive the change pairs passed in as
 * additional params
 */
mUtil.adjustMemberKeys = function(arr) {
    for (let i = 0, n = arr.length; i < n; i++) {
        for (let j = 1, m = arguments.length; j < m; j++) {
            if (arr[i][arguments[j][1]]) {
                arr[i][arguments[j][0]] = arr[i][arguments[j][1]];
                delete arr[i][arguments[j][1]];
            }
        }
    }
};

/**
 * Takes an array of objects and, for each object, creates the specified key (if
 * not already present) with the same value as the specified source key for each
 * change pair passed in as an additional parameter.
 * E.g., fillInMemberKeys(arr, ['to', 'from'], ['to', 'from'], ...)
 * @param {!Array} arr an array of objects that will receive the change pairs passed in as
 * additional params
 */
mUtil.fillInMemberKeys = function(arr) {
    for (let i = 0, n = arr.length; i < n; i++) {
        for (let j = 1, m = arguments.length; j < m; j++) {
            if (!arr[i][arguments[j][0]]) {
                arr[i][arguments[j][0]] = arr[i][arguments[j][1]];
            }
        }
    }
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
 * @param {!Object} lead a page lead object from buildLeadObject in mobile-sections.js
 * @return {!Object} a set of useful page title strings
 */
mUtil.buildTitleDictionary = function(title, lead) {
    return {
        title: title.getPrefixedDBKey(),
        normalized_title: lead.normalizedtitle,
        display_title: lead.displaytitle,
        namespace_id: lead.ns,
        namespace_name: lead.ns_text,
    };
};

/*
 * Build a summary for the page given in req
 * @param {!Object} title a mediawiki-title object for the page title
 * @param {!Object} lead a page lead object for the page
 * @return {!Object} a summary 2.0 spec-compliant page summary object
 */
mUtil.buildSummary = function(domain, title, lead) {
    let summary = {};
    const type = 'standard';
    let code = 200;

    if (!lead) {
        return false;
    } else if (lead.contentmodel || !mUtil.SUMMARY_NS_WHITELIST.includes(lead.ns)) {
        code = 204;
    } else if (lead.intro) {
        summary = transforms.summarize(lead.intro);
    } else {
        // If the lead introduction is empty we should consider it
        // a placeholder e.g. redirect page. To avoid sending an empty
        // summary 204. (T176517)
        code = 204;
    }
    return Object.assign({
        code,
        type,
        title: lead.normalizedtitle,
        displaytitle: lead.displaytitle,
        titles: mUtil.buildTitleDictionary(title, lead),
        pageid: lead.id,
        thumbnail: lead.thumbnail,
        originalimage: lead.originalimage,
        lang: lead.lang,
        dir: lead.dir,
        revision: lead.revision,
        timestamp: lead.lastmodified,
        description: lead.description,
        coordinates: lead.geo && {
            lat: lead.geo.latitude,
            lon: lead.geo.longitude
        },
        content_urls: mUtil.buildContentUrls(domain, title, lead),
        api_urls: mUtil.buildApiUrls(domain, title, lead),
    }, summary);
};

mUtil.buildContentUrls = function(domain, title, lead) {
    return {
        page: `https://${domain}/wiki/${title.getPrefixedDBKey()}`,
        revisions: `https://${domain}/wiki/${title.getPrefixedDBKey()}?action=history`,
        edit: `https://${domain}/wiki/${title.getPrefixedDBKey()}?action=edit`,
        talk: lead.talk_ns_text ? `https://${domain}/wiki/${lead.talk_ns_text}:${title.getKey()}` : undefined,
    };
};

mUtil.buildApiUrls = function(domain, title, lead) {
    return {
        summary: `https://${domain}/api/rest_v1/page/summary/${title.getPrefixedDBKey()}`,
        mobile_sections: `https://${domain}/api/rest_v1/page/mobile-sections/${title.getPrefixedDBKey()}`,
        // read_html: `https://${domain}/api/rest_v1/page/read-html/${title.getPrefixedDBKey()}`,
        // content_html: `https://${domain}/api/rest_v1/page/content-html/${title.getPrefixedDBKey()}`,
        // metadata: `https://${domain}/api/rest_v1/page/metadata/${title.getPrefixedDBKey()}`,
        // references: `https://${domain}/api/rest_v1/page/references/${title.getPrefixedDBKey()}`,
        // media: `https://${domain}/api/rest_v1/page/media/${title.getPrefixedDBKey()}`,
        edit_html: `https://${domain}/api/rest_v1/page/html/${title.getPrefixedDBKey()}`,
        talk_page_html: lead.talk_ns_text ? `https://${domain}/api/rest_v1/page/html/${lead.talk_ns_text}:${title.getKey()}` : undefined,
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

/* jslint bitwise: true */
/* eslint no-bitwise: ["error", { "allow": ["<<"] }] */
mUtil.hashCode = function(string) {
    return string.split('').reduce((prevHash, currVal) =>
       ((prevHash << 5) - prevHash) + currVal.charCodeAt(0), 0);
};

module.exports = mUtil;
