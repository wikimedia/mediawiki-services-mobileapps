/**
 * MediaWiki API helpers
 */

'use strict';

const _ = require('underscore');
const BBPromise = require('bluebird');
const sUtil = require('./util');
const api = require('./api-util');
const wikiLanguage = require('./wikiLanguage');
const HTTPError = sUtil.HTTPError;
const Title = require('mediawiki-title').Title;
const Namespace = require('mediawiki-title').Namespace;
const constants = require('./mwapi-constants');
const thumbnail = require('./thumbnail');

const mwapi = {};

/**
 * Extends an object of keys for an api query with
 * common api parameters.
 *
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
            if (response.body.error.code === 'missingtitle') {
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
mwapi.getSiteInfo = function(req) {
    const rp = req.params;
    if (!siteInfoCache[rp.domain]) {
        const query = apiParams({
            action: 'query',
            meta: 'siteinfo|allmessages',
            siprop: 'general|namespaces|namespacealiases|specialpagealiases',
            ammessages: 'toc'
        });

        siteInfoCache[rp.domain] = api.mwApiGet(req, query)
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
 *
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
 *
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

mwapi.queryForMetadata = (req, query, responseBuilder) => {
    const languageCode = wikiLanguage.getLanguageCode(req.params.domain);
    const isLanguageCodeWithVariants = wikiLanguage.isLanguageCodeWithVariants(languageCode);
    let descriptionPromise;

    function parseDescription(page, entities, languages) {
        let result;
        if (page.description) {
            result = {
                value: page.description,
                source: page.descriptionsource
            };
        }
        if (result && result.source === 'local') {
            return result;
        }
        if (languages.length && entities) {
            const entityVals = _.values(entities);
            for (let i = 0, len = languages.length; i < len; i++) {
                const lang = languages[i];
                const found = entityVals.find(e => {
                    return e.descriptions && e.descriptions[lang] && e.descriptions[lang].value;
                });
                if (found) {
                    result = {
                        value: found.descriptions[lang].value,
                        source: 'central'
                    };
                    break;
                }
            }
        }
        return result;
    }

    let languages = [];
    if (isLanguageCodeWithVariants) {
        const site = `${languageCode}wiki`;
        const acceptLanguage = req.headers['accept-language'];
        languages = wikiLanguage.relevantWikiLanguageCodesFromAcceptLanguageHeader(
            acceptLanguage,
            languageCode
        );
        descriptionPromise = mwapi.getDescription(req, site, languages);
    } else {
        descriptionPromise = BBPromise.resolve({});
    }
    return BBPromise.join(
        mwapi.getSiteInfo(req),
        mwapi.getDisplayTitle(req),
        descriptionPromise,
        api.mwApiGet(req, query),
        (siteinfo, parse, wbEntities, metadata) => {
            const body = metadata.body;
            const page = body.query && body.query.pages && body.query.pages[0];
            const entities = wbEntities && wbEntities.body && wbEntities.body.entities;
            const title = {
                normalized: (body.query
                    && body.query.normalized && body.query.normalized[0]
                    && body.query.normalized[0].to)
                    || page.title,
                display: (parse && parse.body && parse.body.parse && parse.body.parse.displaytitle)
                    || (page.pageprops && page.pageprops.displaytitle)
                    || page.title
            };
            const description = parseDescription(page, entities, languages);

            if (!page || page.missing || page.invalid) {
                throw new HTTPError({
                    status: 404,
                    type: 'missingtitle',
                    title: "The page you requested doesn't exist",
                    detail: body
                });
            }

            return responseBuilder(page, siteinfo, title, description);
        });
};

mwapi.getMetadataForMobileHtml = (req) => {
    const query = apiParams({
        action: 'query',
        prop: 'description|info|pageimages|pageprops',
        inprop: 'protection',
        pilicense: 'any',
        piprop: 'original',
        pilangcode: wikiLanguage.relevantLanguageVariantOrCode(req),
        titles: req.params.title
    });

    return mwapi.queryForMetadata(req, query, (page, siteinfo, title, description) => {
        return {
            description: description && description.value,
            description_source: description && description.source,
            displaytitle: title.display,
            normalizedtitle: title.normalized,
            protection: page.protection,
            originalimage: page.original,
            pageprops: page.pageprops
        };
    });
};

mwapi.getMetadataForMetadata = (req) => {
    const props = ['pageprops', 'info', 'description', 'langlinks', 'categories'];

    const query = apiParams({
        action: 'query',
        prop: props.join('|'),
        titles: req.params.title,
        lllimit: 'max',
        inprop: 'protection',
        clprop: 'hidden',
        cllimit: 50,
    });

    return mwapi.queryForMetadata(req, query, (page, siteinfo, title, description) => {
        return {
            title: page.title,
            displaytitle: title.display,
            coordinates: page.coordinates,
            langlinks: page.langlinks,
            protection: page.protection && mwapi.simplifyProtectionObject(page.protection),
            description: description && description.value,
            description_source: description && description.source,
            categories: page.categories
        };
    });
};

mwapi.getDisplayTitle = (req) => {
    const query = apiParams({
        action: 'parse',
        prop: 'displaytitle',
        page: req.params.title
    });
    return api.mwApiGet(req, query);
};

mwapi.getDescription = (req, site, languages) => {
    const query = apiParams({
        action: 'wbgetentities',
        sites: site,
        languages: languages.join('|'),
        titles: req.params.title,
        props: 'descriptions'
    });
    return api.mwApiGet(req, query, 'www.wikidata.org');
};

mwapi.getMetadataForSummary = (req, thumbSize) => {
    const props = ['coordinates', 'description', 'pageprops', 'pageimages', 'revisions', 'info'];

    const query = apiParams({
        action: 'query',
        prop: props.join('|'),
        titles: req.params.title,
        pilicense: 'any',
        piprop: 'thumbnail|original|name',
        pilangcode: wikiLanguage.relevantLanguageVariantOrCode(req),
        pithumbsize: thumbSize,
        rvprop: 'contentmodel',
        rvslots: 'main',
    });

    return mwapi.queryForMetadata(req, query, (page, siteinfo, title, description) => {
        const revision = page.revisions && page.revisions[0];
        const contentmodel = revision && revision.slots && revision.slots.main
            && revision.slots.main.contentmodel;
        return {
            id: page.pageid,
            title: page.title,
            displaytitle: title.display,
            pageprops: page.pageprops,
            normalizedtitle: title.normalized || page.title,
            ns: page.ns,
            nsText: siteinfo.namespaces[page.ns].name,
            thumbnail: page.thumbnail,
            originalimage: page.original,
            dir: page.pagelanguagedir,
            lang: page.pagelanguagehtmlcode,
            description: description && description.value,
            description_source: description && description.source,
            geo: page.coordinates && mwapi.getPrimaryEarthCoordinates(page.coordinates),
            mobileHost: siteinfo.general.mobileserver,
            mainpage: siteinfo.general.mainpage === page.title ? true : undefined,
            redirect: page.redirect,
            contentmodel,
            talkNsText: page.ns % 2 === 0 ? siteinfo.namespaces[page.ns + 1]
                && new Namespace(page.ns + 1, siteinfo).getNormalizedText() : undefined
        };
    });
};

/**
 * Builds the request to get page metadata from MW API action=query
 *
 * @param {!Object} req the request object
 * @return {!Promise} a promise resolving as an JSON object containing the response
 */
mwapi.getMetadataForMobileSections = (req, thumbSize) => {
    const props = ['coordinates', 'description', 'pageprops', 'pageimages', 'revisions',
        'info', 'langlinks'];

    const query = apiParams({
        action: 'query',
        prop: props.join('|'),
        titles: req.params.title,
        pilicense: 'any',
        piprop: 'thumbnail|original|name',
        pithumbsize: thumbSize,
        pilangcode: wikiLanguage.relevantLanguageVariantOrCode(req),
        inprop: 'protection',
        lllimit: 'max',
        rvprop: ['ids', 'timestamp', 'user', 'contentmodel'].join('|'),
        rvslots: 'main',
    });

    return mwapi.queryForMetadata(req, query, (page, siteinfo, title, description) => {
        const revision = page.revisions && page.revisions[0];
        const contentmodel = revision && revision.slots && revision.slots.main
            && revision.slots.main.contentmodel;
        const protection = page.protection && mwapi.simplifyProtectionObject(page.protection);

        return {
            id: page.pageid,
            title: page.title,
            ns: page.ns,
            displaytitle: title.display,
            normalizedtitle: title.normalized || page.title,
            pageprops: page.pageprops,
            lastmodified: revision && revision.timestamp,
            lastmodifier: revision && {
                anon: revision.anon,
                user: revision.user,
                gender: 'unknown' // Always set to unknown until support in API added (T172228)
            },
            image: page.pageimage ? { file: page.pageimage } : undefined,
            languagecount: page.langlinks ? page.langlinks.length : 0,
            thumbnail: page.thumbnail,
            originalimage: page.original,
            protection,
            editable: protection && !protection.edit,
            mainpage: siteinfo.general.mainpage === page.title ? true : undefined,
            revision: revision && revision.revid,
            description: description && description.value,
            description_source: description && description.source,
            contentmodel,
            redirect: page.redirect, // needed to ensure MCS isn't handling redirects internally
            // primary earth coordinates, if any
            geo: page.coordinates && mwapi.getPrimaryEarthCoordinates(page.coordinates)
        };
    });
};

/**
 * Builds the request to get all sections from MW API action=mobileview.
 * We can avoid using mobileview API when Parsoid supports language variants for Chinese.
 *
 * @param {!Object} req the request object
 * @return {!Promise} a promise resolving as an JSON object containing the response
 */
mwapi.getPageFromMobileview = function(req) {
    const props = ['text', 'sections', 'languagecount', 'thumb', 'image', 'id', 'revision',
        'description', 'lastmodified', 'namespace', 'normalizedtitle', 'displaytitle', 'protection',
        'editable'];

    const query = apiParams({
        action: 'mobileview',
        page: req.params.title,
        prop: props.join('|'),
        sections: 'all',
        sectionprop: 'toclevel|line|anchor',
        noheadings: true,
        thumbwidth: constants.LEAD_IMAGE_XL,
    });

    // Workaround for a bug in MobileView where it only works with relevant language codes
    // For example: en-us, zh-tw won't work for zhwiki, en-us needs to be filtered out
    const headers = {};
    const languageCode = wikiLanguage.getLanguageCode(req.params.domain);
    if (wikiLanguage.isLanguageCodeWithVariants(languageCode)) {
        const acceptLanguage = req.headers['accept-language'];
        const languages = wikiLanguage.relevantWikiLanguageCodesFromAcceptLanguageHeader(
            acceptLanguage,
            languageCode
        );
        if (languages[0]) {
            headers['accept-language'] = languages[0];
        }
    }

    return api.mwApiGet(req, query, req.params.domain, headers).then((response) => {
        mwapi.checkForMobileviewInResponse(req.logger, response);
        return response;
    });
};

/**
 * Builds a set of URLs for different thumbnail sizes of an image based on the provided array of
 * widths.
 *
 * @param {!string} initialUrl an initial thumbnail URL for an image, for example:
 *     https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Foo.jpg/640px-Foo.jpg
 * @param {!number[]} desiredWidths an array of desired widths for which to construct URLs
 * @return {!Object} with widths as keys and the corresponding thumb URLs as values
 */
mwapi.buildImageUrlSet = function(initialUrl, desiredWidths) {
    const result = {};
    desiredWidths.forEach((width) => {
        result[width] = thumbnail.scaleURL(initialUrl, width) || initialUrl;
    });
    return result;
};

/**
 * Builds a set of URLs for lead images with different sizes based on common bucket widths:
 * 320, 640, 800, 1024.
 */
mwapi.buildLeadImageUrls = function(initialUrl) {
    return mwapi.buildImageUrlSet(initialUrl, [ constants.LEAD_IMAGE_S, constants.LEAD_IMAGE_M,
        constants.LEAD_IMAGE_L, constants.LEAD_IMAGE_XL ]);
};

/**
 * Get a Title object for a MW title string
 *
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

/**
 * Changes the namespace prefix of a page title to the canonical File: prefix
 *
 * @param  {!string} pageTitle title of a page with a namespace
 * @return {!string} filePageTitle title with a File: prefix
 */
mwapi.getCanonicalFileTitle = function(title) {
    return title && title.replace(/^.+:/g, 'File:');
};

module.exports = mwapi;
