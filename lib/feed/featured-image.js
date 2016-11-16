/**
 * To retrieve the picture of the day for a given date.
 */

'use strict';

const BBPromise = require('bluebird');
const preq = require('preq');
const api = require('../api-util');
const dateUtil = require('../dateUtil');
const domino = require('domino');
const mwapi = require('../mwapi');
const mUtil = require('../mobile-util');
const parsoid = require('../parsoid-access');
const sUtil = require('../util');
const HTTPError = sUtil.HTTPError;

const COMMONS_URL = 'commons.wikimedia.org';

/**
 * Builds the request to get the Picture of the day of a given date.
 *
 * @param {Object} app the application object
 * @param {Date} date for which day the featured image of theday is requested
 * @return {Promise} a promise resolving as an JSON object containing the response
 */
function requestPictureOfTheDay(app, date) {
    const isoDate = dateUtil.formatISODate(date);
    return api.mwApiGet(app, COMMONS_URL, {
        action: 'query',
        format: 'json',
        formatversion: 2,
        generator: 'images',
        prop: 'imageinfo|revisions',
        iiextmetadatafilter: 'ImageDescription',
        iiextmetadatamultilang: true,
        iiprop: 'url|extmetadata|dimensions',
        iiurlwidth: mwapi.CARD_THUMB_FEATURE_SIZE,
        rawcontinue: '',
        titles: `Template:Potd/${isoDate}`
    });
}

// -- functions dealing with responses:

function getPageObject(response, dontThrow) {
    const page = response.body.query.pages[0];
    if (!page.pageid || page.missing === true) {
        if (dontThrow) {
            page.notfound = true;
            return page;
        } else {
            throw new HTTPError({
                status: 404,
                type: 'not_found',
                title: 'No picture of the day for this date',
                detail: 'There is no picture of the day for this date.'
            });
        }
    }
    return page;
}

/** @param {!Object.<string, string>} descriptions Map of languages to descriptions
    @param {!string} lang Preferred language
    @return {?string} Language */
function pickDescriptionLang(descriptions, lang) {
    const fallbackLang = 'en';
    return descriptions[lang]
        ? lang
        : descriptions[fallbackLang]
            ? fallbackLang
            : Object.keys(descriptions)[0];
}

function buildPayload(page, lang) {
    if (!page || page.notfound) {
        return undefined;
    }

    let description, allDescriptions, imageinfo = page.imageinfo && page.imageinfo[0];

    // extmetadata returns an empty array if no info is available :(
    if (!Array.isArray(imageinfo.extmetadata)) {
        allDescriptions = imageinfo.extmetadata && imageinfo.extmetadata.ImageDescription.value;
        lang = allDescriptions[lang] ? lang : 'en';
        description = allDescriptions[lang];
    }

    const ret = {
        title: page.title,
        thumbnail: {
            source: imageinfo && imageinfo.thumburl,
            width: imageinfo && imageinfo.thumbwidth,
            height: imageinfo && imageinfo.thumbheight
        },
        // the full res image:
        image: {
            source: imageinfo.url,
            width: imageinfo.width,
            height: imageinfo.height
        }
    };
    if (description) {
        ret.description = {
            text: description,
            lang: lang
        };
    }
    return ret;
}

function buildEtag(page) {
    return page
        && page.pageid + '/' + mwapi.getRevisionFromExtract(page);
}

/** @param {!domino.Document} doc
    @return {void} */
function removeLangLabels(doc) {
    const labels = doc.querySelectorAll('span[class*=langlabel-]') || [];
    labels.forEach(element => {
        element.parentNode.removeChild(element);
    });
}

/** @param {!domino.Document} doc
    @return {!Object.<string, string>} Map of languages to descriptions */
function queryDescriptions(doc) {
    const descriptions = {};
    const descriptionElements = doc.querySelectorAll('.description[class*=lang-]') || [];
    descriptionElements.forEach(element => {
        descriptions[element.lang] = element.innerHTML.trim();
    });
    return descriptions;
}

function promise(app, req) {
    const aggregated = !!req.query.aggregated;

    if (!dateUtil.validate(dateUtil.hyphenDelimitedDateString(req))) {
        if (aggregated) {
            return BBPromise.resolve({});
        }
        dateUtil.throwDateError();
    }

    const lang = mUtil.getLanguageFromDomain(req.params.domain);
    let ret;
    return requestPictureOfTheDay(app, dateUtil.getRequestedDate(req),
        aggregated)
    .then(function (response) {
        mwapi.checkForQueryPagesInResponse(req, response);
        const page = getPageObject(response);
        ret = {
            payload: buildPayload(page, lang),
            meta: {
                etag: buildEtag(page)
            }
        };

        const parsoidReq = Object.create(req);
        parsoidReq.params = Object.create(req.params);
        parsoidReq.params.title = page.title;
        parsoidReq.params.domain = COMMONS_URL;
        return parsoid.getParsoidHtml(app, parsoidReq);
    }).then(function (response) {
        const doc = domino.createDocument(response.body);
        removeLangLabels(doc);
        const descriptions = queryDescriptions(doc);

        // todo: should we just send all langs like parsoid does?
        const resolvedLang = pickDescriptionLang(descriptions, lang);
        if (resolvedLang && (resolvedLang === lang || !ret.payload.description)) {
            ret.payload.description = {
                lang: resolvedLang,
                text: descriptions[resolvedLang]
            };
        }
        return ret;
    }).catch(function(err) {
        if (err.status === 504) {
            if (aggregated) {
                return BBPromise.resolve({});
            }
            throw new HTTPError({
                status: 404,
                type: 'not_found',
                title: 'No picture of the day for this date',
                detail: 'There is no picture of the day for this date.'
            });
        }
    });
}

module.exports = {
    promise: promise
};
