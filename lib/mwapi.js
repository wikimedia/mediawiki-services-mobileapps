/**
 * MediaWiki API helpers
 */

'use strict';

const BBPromise = require('bluebird');
const sUtil = require('./util');
const api = require('./api-util');
const HTTPError = sUtil.HTTPError;
const Title = require('mediawiki-title').Title;
const Namespace = require('mediawiki-title').Namespace;

const mwapi = {};

mwapi.API_QUERY_MAX_TITLES = 50;

mwapi.CARD_THUMB_LIST_ITEM_SIZE = 320;
mwapi.CARD_THUMB_FEATURE_SIZE = 640;

mwapi.LEAD_IMAGE_S = 320;
mwapi.LEAD_IMAGE_M = 640;
mwapi.LEAD_IMAGE_L = 800;
mwapi.LEAD_IMAGE_XL = 1024;

/**
 * Extends an object of keys for an api query with
 * common api parameters.
 * @param {!Object} query
 * @return {!Object}
 */
function apiParams(query) {
    return Object.assign(query, {
        format: 'json',
        formatversion: 2
    });
}

mwapi.checkForMobileviewInResponse = function(logger, response) {
    if (!(response && response.body && response.body.mobileview)) {
        // we did not get our expected mobileview from the MW API, propagate that

        if (response.body.error && response.body.error.code) {
            if (response.body.error.code === "missingtitle") {
                throw new HTTPError({
                    status: 404,
                    type: 'missingtitle',
                    title: "The page you requested doesn't exist",
                    detail: response.body
                });
            }
            // TODO: add more error conditions here:
        }

        // fall-through to generic error message
        const message = `no mobileview in response: ${JSON.stringify(response.body, null, 2)}`;
        logger.log('warn/mwapi', message);
        throw new HTTPError({
            status: 504,
            type: 'api_error',
            title: 'no mobileview in response',
            detail: response.body
        });
    }
};

mwapi.checkForQueryPagesInResponse = function(req, response) {
    if (!(response && response.body && response.body.query && response.body.query.pages)) {
        // we did not get our expected query.pages from the MW API, propagate that
        req.logger.log('error/mwapi', 'no query.pages in response');
        throw new HTTPError({
            status: 504,
            type: 'api_error',
            title: 'no query.pages in response',
            detail: response.body
        });
    }
};

// copied from restbase/lib/mwUtil.js
mwapi.findSharedRepoDomain = function(siteInfoRes) {
    const sharedRepo = (siteInfoRes.body.query.repos || []).find((repo) => {
        return repo.name === 'shared';
    });
    if (sharedRepo) {
        const domainMatch = /^((:?https?:)?\/\/[^/]+)/.exec(sharedRepo.descBaseUrl);
        if (domainMatch) {
            return domainMatch[0];
        }
    }
};

/**
 * Builds a request for siteinfo data for the MW site for the request domain.
 *
 * @param {!Object} app the application object
 * @param {!Object} req the request object
 * @return {!Promise} a promise resolving as an JSON object containing the response
 */
const siteInfoCache = {};
mwapi.getSiteInfo = function(app, req) {
    const rp = req.params;
    if (!siteInfoCache[rp.domain]) {
        const query = apiParams({
            action: 'query',
            meta: 'siteinfo|allmessages',
            siprop: 'general|languagevariants|namespaces|namespacealiases|specialpagealiases',
            ammessages: 'toc'
        });
        siteInfoCache[rp.domain] = api.mwApiGet(app, req.params.domain, query)
        .then((res) => {
            const general = res.body.query.general;
            const allmessages = res.body.query.allmessages;

            return {
                general: {
                    mainpage: general.mainpage,
                    lang: general.lang,
                    legaltitlechars: general.legaltitlechars,
                    case: general.case,
                    mobileserver: general.mobileserver,
                    toctitle: allmessages[0].content
                },
                variants: res.body.query.languagevariants
                    && res.body.query.languagevariants[general.lang]
                    && Object.keys(res.body.query.languagevariants[general.lang]),
                namespaces: res.body.query.namespaces,
                namespacealiases: res.body.query.namespacealiases,
                specialpagealiases: res.body.query.specialpagealiases,
                sharedRepoRootURI: mwapi.findSharedRepoDomain(res)
            };
        });
    }
    return siteInfoCache[rp.domain];
};

/**
 * Given protection status for an article simplify it to allow easy reference
 * @param {!Array} mwApiProtectionObj e.g.
 *  [ { type: 'edit', level: 'autoconfirmed', expiry: 'infinity' }
 * @return {!Object} { 'edit': ['autoconfirmed'] },
 */
mwapi.simplifyProtectionObject = function(mwApiProtectionObj) {
    const protection = {};
    mwApiProtectionObj.forEach((entry) => {
        const type = entry.type;
        const level = entry.level;

        if (!protection[type]) {
            protection[type] = [];
        }
        if (protection[type].indexOf(level) === -1) {
            protection[type].push(level);
        }
    });
    return protection;
};

/**
 * Extract primary Earth coordinates, if any, from the API 'coordinates' object
 * @param {!Object} coords the coordinates object from the MW API
 * @return {?Object} the primary Earth coordinates, if any
 */
mwapi.getPrimaryEarthCoordinates = (coords) => {
    if (Array.isArray(coords)) {
        const primary = coords.filter(c => c.globe === 'earth' && c.primary);
        if (primary.length) {
            return {
                latitude: primary[0].lat,
                longitude: primary[0].lon
            };
        }
    }
};

/**
 * Builds the request to get page metadata from MW API action=query
 * TODO: Break this up into endpoint-specific metadata calls
 * @param {!Object} app the application object
 * @param {!Object} req the request object
 * @return {!Promise} a promise resolving as an JSON object containing the response
 */
mwapi.getMetadata = ((app, req, thumbSize = mwapi.LEAD_IMAGE_XL) => {
    const props = ['coordinates', 'description', 'pageprops', 'pageimages', 'revisions',
        'info', 'langlinks', 'categories'];

    const query = apiParams({
        action: 'query',
        lllimit: 'max',
        pilicense: 'any',
        piprop: 'thumbnail|original|name',
        pithumbsize: thumbSize,
        inprop: 'protection|varianttitles',
        rvprop: ['ids', 'timestamp', 'user', 'contentmodel'].join('|'),
        rvslots: 'main',
        titles: req.params.title,
        prop: props.join('|'),
        clprop: 'hidden',
        cllimit: 50,
    });

    return BBPromise.join(
        mwapi.getSiteInfo(app, req),
        api.mwApiGet(app, req.params.domain, query),
        (siteinfo, metadata) => {
            const body = metadata.body;
            const page = body.query && body.query.pages && body.query.pages[0];

            if (!page || page.missing || page.invalid) {
                throw new HTTPError({
                    status: 404,
                    type: 'missingtitle',
                    title: 'The page you requested doesn\'t exist',
                    detail: body
                });
            }

            const revision = page.revisions && page.revisions[0];
            const contentmodel = revision && revision.slots && revision.slots.main
                && revision.slots.main.contentmodel;
            const pageprops = page.pageprops;
            const coordinates = page.coordinates;
            const geo = coordinates && mwapi.getPrimaryEarthCoordinates(coordinates);
            const normalized = body.query
                && body.query.normalized && body.query.normalized[0]
                && body.query.normalized[0].to;
            const displayTitle = pageprops && pageprops.displaytitle;
            const title = page.title;
            const image = page.pageimage ? { file: page.pageimage } : undefined;
            const protection = page.protection && mwapi.simplifyProtectionObject(page.protection);
            const modifier = revision && revision.anon !== undefined ? { anon: true } : {};
            modifier.user = revision && revision.user;
            // Always set to unknown until support in API added (T172228)
            modifier.gender = 'unknown';
            const mainpage = siteinfo.general.mainpage === title ? true : undefined;
            const talkNsText = page.ns % 2 === 0 ? siteinfo.namespaces[page.ns + 1]
                && new Namespace(page.ns + 1, siteinfo).getNormalizedText() : undefined;
            const mobileHost = siteinfo.general.mobileserver;

            return {
                geo, // primary earth coordinates, if any
                coordinates, // full coordinates
                contentmodel,
                title: page.title,
                displaytitle: displayTitle || title,
                normalizedtitle: normalized || title,
                pageprops,
                image,
                id: page.pageid,
                dir: page.pagelanguagedir,
                lang: page.pagelanguagehtmlcode,
                langlinks: page.langlinks,
                languagecount: page.langlinks ? page.langlinks.length : 0,
                variants: siteinfo.variants,
                lastmodified: revision && revision.timestamp,
                lastmodifier: modifier,
                thumbnail: page.thumbnail,
                originalimage: page.original,
                ns: page.ns,
                nsText: siteinfo.namespaces[page.ns].name,
                talkNs: talkNsText ? page.ns + 1 : undefined,
                talkNsText,
                protection,
                editable: protection && !protection.edit,
                mainpage,
                revision: revision && revision.revid,
                description: page.description,
                description_source: page.descriptionsource,
                mobileHost,
                redirect: page.redirect, // needed to ensure MCS isn't handling redirects internally
                categories: page.categories,
                varianttitles: page.varianttitles,
            };
        });
});

/**
 * Builds the request to get all sections from MW API action=mobileview.
 * We can avoid using mobileview API when Parsoid returns <section> tags in its
 * response.
 * @param {!Object} app the application object
 * @param {!Object} req the request object
 * @return {!Promise} a promise resolving as an JSON object containing the response
 */
mwapi.getMainPageData = function(app, req) {
    const props = ['text', 'sections', 'languagecount', 'thumb', 'image', 'id', 'revision',
        'description', 'lastmodified', 'normalizedtitle', 'displaytitle', 'protection',
        'editable'];

    const query = apiParams({
        action: 'mobileview',
        page: req.params.title,
        prop: props.join('|'),
        sections: 'all',
        sectionprop: 'toclevel|line|anchor',
        noheadings: true,
        thumbwidth: mwapi.LEAD_IMAGE_XL
    });
    return api.mwApiGet(app, req.params.domain, query)
    .then((response) => {
        mwapi.checkForMobileviewInResponse(req.logger, response);
        return response;
    });
};

mwapi.getRevisionFromExtract = function(extractObj) {
    return extractObj.revisions[0].revid;
};

mwapi.buildTitleResponse = function(pageObj) {
    return { items: [ { title: pageObj.title } ] };
};

mwapi.buildSummaryResponse = function(extractObj, dbtitle) {
    return {
        title: dbtitle,
        normalizedtitle: extractObj.title,
        thumbnail: extractObj.thumbnail,
        description: extractObj.terms && extractObj.terms.description[0],
        extract: extractObj.extract
    };
};

mwapi.getMostReadMetadata = function(app, req, titlesList) {
    const query = apiParams({
        action: 'query',
        meta: 'siteinfo',
        siprop: 'general',
        titles: titlesList
    });
    return api.mwApiGet(app, req.params.domain, query);
};

/**
 * Scales a single image thumbnail URL to another size, if possible.
 * @param {!string} initialUrl an initial thumbnail URL for an image, for example:
 *     https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Foo.jpg/640px-Foo.jpg
 * @param {!number} desiredWidth the desired width
 * @return {!string} an image URL, updated with the desired size if possible
 */
mwapi.scaledImageUrl = function(initialUrl, desiredWidth) {
    const thumbInPathRegex = /\/thumb\//;
    if (!initialUrl.match(thumbInPathRegex)) {
        return initialUrl;
    }
    const thumbWidthRegex = /(\d+)px-[^/]+$/;
    const match = thumbWidthRegex.exec(initialUrl);
    if (match) {
        const originalWidth = match[1];
        if (originalWidth > desiredWidth) {
            const newSubstring = match[0].replace(match[1], desiredWidth);
            return initialUrl.replace(thumbWidthRegex, newSubstring);
        }
    }
    return initialUrl;
};

/**
 * Builds a set of URLs for different thumbnail sizes of an image based on the provided array of
 * widths.
 * @param {!string} initialUrl an initial thumbnail URL for an image, for example:
 *     https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Foo.jpg/640px-Foo.jpg
 * @param {!number[]} desiredWidths an array of desired widths for which to construct URLs
 * @return {!Object} with widths as keys and the corresponding thumb URLs as values
 */
mwapi.buildImageUrlSet = function(initialUrl, desiredWidths) {
    const result = {};
    desiredWidths.forEach((width) => {
        result[width] = mwapi.scaledImageUrl(initialUrl, width);
    });
    return result;
};

/**
 * Builds a set of URLs for lead images with different sizes based on common bucket widths:
 * 320, 640, 800, 1024.
 */
mwapi.buildLeadImageUrls = function(initialUrl) {
    return mwapi.buildImageUrlSet(initialUrl, [ mwapi.LEAD_IMAGE_S, mwapi.LEAD_IMAGE_M,
        mwapi.LEAD_IMAGE_L, mwapi.LEAD_IMAGE_XL ]);
};

/**
 * Get a Title object for a MW title string
 * @param {!string} title a MediaWiki page title string
 * @param {!Object} siteinfo siteinfo from the MW API
 * @return {!Object} a mediawiki-title Title object that can be used to obtain a db-normalized title
 */
mwapi.getTitleObj = function(title, siteinfo) {
    return Title.newFromText(title, siteinfo);
};

mwapi.getDbTitle = function(title, siteinfo) {
    return mwapi.getTitleObj(title, siteinfo).getPrefixedDBKey();
};

module.exports = mwapi;
