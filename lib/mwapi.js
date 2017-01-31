/**
 * MediaWiki API helpers
 */

'use strict';

const sUtil = require('./util');
const api = require('./api-util');
const HTTPError = sUtil.HTTPError;
const Title = require('mediawiki-title').Title;

const mwapi = {};

mwapi.API_QUERY_MAX_TITLES = 50;

mwapi.CARD_THUMB_LIST_ITEM_SIZE = 320;
mwapi.CARD_THUMB_FEATURE_SIZE = 640;

mwapi.LEAD_IMAGE_S = 320;
mwapi.LEAD_IMAGE_M = 640;
mwapi.LEAD_IMAGE_L = 800;
mwapi.LEAD_IMAGE_XL = 1024;

mwapi.WIDTH_IN_IMAGE_URL_REGEX = /\/(\d+)px-/;


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
        const query = {
            action: 'query',
            format: 'json',
            formatversion: 2,
            meta: 'siteinfo',
            siprop: 'general|namespaces|namespacealiases'
        };
        siteInfoCache[rp.domain] = api.mwApiGet(app, req.params.domain, query)
        .then((res) => {
            return {
                general: {
                    lang: res.body.query.general.lang,
                    legaltitlechars: res.body.query.general.legaltitlechars,
                    case: res.body.query.general.case
                },
                namespaces: res.body.query.namespaces,
                namespacealiases: res.body.query.namespacealiases,
                sharedRepoRootURI: mwapi.findSharedRepoDomain(res)
            };
        });
    }
    return siteInfoCache[rp.domain];
};

/**
 * Builds the request to get page metadata from MW API action=mobileview.
 *
 * @param {!Object} app the application object
 * @param {!Object} req the request object
 * @return {!Promise} a promise resolving as an JSON object containing the response
 */
mwapi.getMetadata = function(app, req) {
    const props = ['languagecount', 'thumb', 'image', 'id', 'revision', 'description',
        'lastmodified', 'lastmodifiedby', 'normalizedtitle', 'displaytitle', 'protection',
        'editable', 'namespace', 'pageprops'];

    const query = {
        action: 'mobileview',
        format: 'json',
        formatversion: 2,
        page: req.params.title,
        prop: props.join('|'),
        ppprop: 'wikibase_item',
        thumbwidth: mwapi.LEAD_IMAGE_XL
    };
    return api.mwApiGet(app, req.params.domain, query)
    .then((response) => {
        mwapi.checkForMobileviewInResponse(req.logger, response);
        return response;
    });
};

/**
 * Builds the request to get all sections from MW API action=mobileview.
 *
 * @param {!Object} app the application object
 * @param {!Object} req the request object
 * @return {!Promise} a promise resolving as an JSON object containing the response
 */
mwapi.getAllSections = function(app, req) {
    const props = ['text', 'sections', 'languagecount', 'thumb', 'image', 'id', 'revision',
        'description', 'lastmodified', 'normalizedtitle', 'displaytitle', 'protection',
        'editable'];

    const query = {
        action: 'mobileview',
        format: 'json',
        formatversion: 2,
        page: req.params.title,
        prop: props.join('|'),
        sections: 'all',
        sectionprop: 'toclevel|line|anchor',
        noheadings: true,
        thumbwidth: mwapi.LEAD_IMAGE_XL
    };
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
    const query = {
        action: 'query',
        format: 'json',
        formatversion: 2,
        meta: 'siteinfo',
        siprop: 'general',
        titles: titlesList
    };
    return api.mwApiGet(app, req.params.domain, query);
};

mwapi.scaledImageUrl = function(initialUrl, initialWidth, desiredWidth) {
    if (initialWidth > desiredWidth) {
        return initialUrl.replace(mwapi.WIDTH_IN_IMAGE_URL_REGEX, `/${desiredWidth}px-`);
    } else {
        return initialUrl;
    }
};

/**
 * Builds a set of URLs for different sizes of an image based on the provided array of widths.
 * @param {!string}   initialUrl the initial URL for an image (caller already checked for undefined)
 *      example URL:
 *     //upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Cat_poster_1.jpg/640px-Cat_poster_1.jpg
 * @param {!number[]} widths     an array of desired widths for which to construct URLs
 */
mwapi.buildImageUrlSet = function(initialUrl, widths) {
    const match = mwapi.WIDTH_IN_IMAGE_URL_REGEX.exec(initialUrl);
    const result = {};
    widths.sort((a, b) => {
        return a - b;
    });
    if (match) {
        const initialWidth = match[1];
        if (initialWidth > widths[0]) {
            for (const i in widths) {
                if ({}.hasOwnProperty.call(widths, i)) {
                    result[widths[i]] = mwapi.scaledImageUrl(initialUrl, initialWidth, widths[i]);
                }
            }
            return result;
        }
    }

    // can't get a bigger size than smallest request size of 320 or don't know the original size.
    for (const i in widths) {
        if ({}.hasOwnProperty.call(widths, i)) {
            result[widths[i]] = initialUrl;
        }
    }
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
 *
 * TODO: This is copied nearly verbatim from restbase/lib/mwUtil.js.  Should we
 * put it somewhere we can share it?
 */
mwapi.getTitleObj = function(app, req, title) {
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
