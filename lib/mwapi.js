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

mwapi.WIDTH_IN_IMAGE_URL_REGEX = /\/(\d+)px-/;

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
            meta: 'siteinfo',
            siprop: 'general|namespaces|namespacealiases|specialpagealiases'
        });
        siteInfoCache[rp.domain] = api.mwApiGet(app, req.params.domain, query)
        .then((res) => {
            const general = res.body.query.general;
            return {
                general: {
                    mainpage: general.mainpage,
                    lang: general.lang,
                    legaltitlechars: general.legaltitlechars,
                    case: general.case,
                    mobileserver: general.mobileserver
                },
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
 * Builds the request to get page metadata from MW API action=query
 * @param {!Object} app the application object
 * @param {!Object} req the request object
 * @return {!Promise} a promise resolving as an JSON object containing the response
 */
function getMetadataActionApi(app, req) {
    const props = ['coordinates','pageprops', 'pageimages', 'pageterms', 'revisions',
        'info', 'langlinks'];

    const query = apiParams({
        action: 'query',
        lllimit: 'max',
        pilicense: 'any',
        piprop: 'thumbnail|original|name',
        pithumbsize: mwapi.LEAD_IMAGE_XL,
        wbptterms: 'description',
        inprop: ['protection'].join('|'),
        rvprop: ['ids', 'timestamp', 'user', 'contentmodel'].join('|'),
        titles: req.params.title,
        prop: props.join('|')
    });

    return BBPromise.props({
        siteinfo: mwapi.getSiteInfo(app, req),
        metadata: api.mwApiGet(app, req.params.domain, query)
    }).then((res) => {
        const body = res.metadata.body;
        const page = body.query && body.query.pages && body.query.pages[0];
        const coords = page && page.coordinates && page.coordinates[0];
        const revision = page && page.revisions && page.revisions[0];
        const pageprops = page && page.pageprops;
        let geo;

        if (page.missing) {
            throw new HTTPError({
                status: 404,
                type: 'missingtitle',
                title: 'The page you requested doesn\'t exist',
                detail: body
            });
        }

        // Extract coordinates from the API response
        if (coords) {
            geo = {
                latitude: coords.lat,
                longitude: coords.lon
            };
        }
        const normalized = body.query
            && body.query.normalized && body.query.normalized[0]
            && body.query.normalized[0].to;
        const displayTitle = pageprops && pageprops.displaytitle;
        const title = page.title;
        const thumbUrl = page.thumbnail && page.thumbnail.source;
        const thumb = thumbUrl ? {
            url: thumbUrl.replace('https:', '')
        } : undefined;
        const image = page.pageimage ? {
            file: page.pageimage
        } : undefined;
        const protection = page.protection && mwapi.simplifyProtectionObject(page.protection);
        const modifier = revision && revision.anon !== undefined ? { anon: true } : {};
        modifier.user = revision && revision.user;
        // Always set to unknown until support in API added (T172228)
        modifier.gender = 'unknown';
        const mainpage = res.siteinfo.general.mainpage === title ? true : undefined;
        const talkNsText = page.ns % 2 === 0 ? res.siteinfo.namespaces[page.ns + 1]
            && new Namespace(page.ns + 1, res.siteinfo).getNormalizedText() : undefined;
        const mobileHost = res.siteinfo.general.mobileserver;

        return {
            geo,
            contentmodel: revision && revision.contentmodel,
            title: page.title,
            displaytitle: displayTitle || title,
            normalizedtitle: normalized || title,
            pageprops,
            image,
            id: page.pageid,
            dir: page.pagelanguagedir,
            lang: page.pagelanguagehtmlcode,
            languagecount: page.langlinks ? page.langlinks.length : 0,
            lastmodified: revision && revision.timestamp,
            lastmodifier: modifier,
            thumb,
            thumbnail: page.thumbnail,
            originalimage: page.original,
            ns: page.ns,
            nsText: res.siteinfo.namespaces[page.ns].name,
            talkNs: talkNsText ? page.ns + 1 : undefined,
            talkNsText,
            protection,
            editable: protection && !protection.edit,
            mainpage,
            revision: revision && revision.revid,
            description: page.terms && page.terms.description[0],
            mobileHost
        };
    });
}

/**
 * Builds the request to get page metadata
 * @param {!Object} app the application object
 * @param {!Object} req the request object
 * @return {!Promise} a promise resolving as an JSON object containing the response
 */
mwapi.getMetadata = function(app, req) {
    return getMetadataActionApi(app, req).then((meta) => {
        return meta;
    });
};

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
    return {
        items: [
            {
                title: pageObj.title
            }
        ]
    };
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

mwapi.scaledThumbObj = function(thumb, originalWidth, desiredWidth) {
    const source = mwapi.scaledImageUrl(thumb.source, desiredWidth);
    const match = mwapi.WIDTH_IN_IMAGE_URL_REGEX.exec(source);
    const width = match ? parseInt(match[1], 10) : originalWidth;
    const height = Math.round(width * thumb.height / thumb.width);
    return { source, width, height };
};

/**
 * Scales a single image thumbnail URL to another size, if possible.
 * @param {!string} initialUrl the initial URL for an image
 *      example:
 *     //upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Cat_poster_1.jpg/640px-Cat_poster_1.jpg
 * @param {!number} width the desired width
 * @return {!string} an image URL, updated with the desired size if possible
 */
mwapi.scaledImageUrl = function(initialUrl, width) {
    const match = mwapi.WIDTH_IN_IMAGE_URL_REGEX.exec(initialUrl);
    if (match) {
        const originalWidth = match[1];
        if (originalWidth > width) {
            return initialUrl.replace(mwapi.WIDTH_IN_IMAGE_URL_REGEX, `/${width}px-`);
        }
    }
    return initialUrl;
};

/**
 * Builds a set of URLs for different sizes of an image based on the provided array of widths.
 * @param {!string} initialUrl the initial URL for an image
 *      example:
 *     //upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Cat_poster_1.jpg/640px-Cat_poster_1.jpg
 * @param {!number[]} widths an array of desired widths for which to construct URLs
 * @return {!Object} an object containing the widths as keys, and the corresponding image URLs as
 *     values
 */
mwapi.buildImageUrlSet = function(initialUrl, widths) {
    const result = {};
    widths.forEach((width) => {
        result[width] = mwapi.scaledImageUrl(initialUrl, width);
    });
    return result;
};

/**
 * Builds a set of URLs for lead images with different sizes based on common bucket widths:
 * 320, 640, 800, 1024.
 */
mwapi.buildLeadImageUrls = function(initialUrl) {
    initialUrl = initialUrl.replace(/^http:/, 'https:');
    return mwapi.buildImageUrlSet(initialUrl, [ mwapi.LEAD_IMAGE_S, mwapi.LEAD_IMAGE_M,
        mwapi.LEAD_IMAGE_L, mwapi.LEAD_IMAGE_XL ]);
};

/**
 * Get a Title object for a MW title string
 * @param {!Object} app the application object
 * @param {!Object} req the Request object
 * @param {!string} title a MediaWiki page title string
 * @return {!Object} a mediawiki-title Title object that can be used to obtain a db-normalized title
 *
 * TODO: This is copied nearly verbatim from restbase/lib/mwUtil.js. Can we share it somewhere?
 */
mwapi.getTitleObj = function(app, req, title = req.params.title) {
    return mwapi.getSiteInfo(app, req)
    .then((siteInfo) => {
        return Title.newFromText(title, siteInfo);
    })
    .catch((e) => {
        throw new HTTPError({
            status: 400,
            body: {
                type: 'bad_request',
                detail: e.message
            }
        });
    });
};

mwapi.getDbTitle = function(app, req, title) {
    return mwapi.getTitleObj(app, req, title).then((response) => {
        return response.getPrefixedDBKey();
    });
};

module.exports = mwapi;
