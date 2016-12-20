/**
 * To retrieve the picture of the day for a given date.
 */

'use strict';

const BBPromise = require('bluebird');
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
 * @prop {!string} lang Localization language
 * @prop {!string} text Localized description
 */
class Description {
    constructor(lang, text) {
        this.lang = lang;
        this.text = text;
    }
}

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

    if (descriptions[lang]) {
        return lang;
    }

    if (descriptions[fallbackLang]) {
        return fallbackLang;
    }

    return Object.keys(descriptions)[0];
}

function buildPayload(page, lang) {
    if (!page || page.notfound) {
        return undefined;
    }

    const payload = {
        title: page.title
    };

    const imageinfo = page.imageinfo && page.imageinfo[0];
    if (!imageinfo) {
        return payload;
    }

    payload.image = {
        source: imageinfo.url,
        width: imageinfo.width,
        height: imageinfo.height
    };
    payload.thumbnail = {
        source: imageinfo.thumburl,
        width: imageinfo.thumbwidth,
        height: imageinfo.thumbheight
    };

    // extmetadata is an empty array when data is unavailable
    if (!imageinfo.extmetadata || Array.isArray(imageinfo.extmetadata)) {
        return payload;
    }

    const descriptions = imageinfo.extmetadata.ImageDescription.value;
    const resolvedLang = descriptions && pickDescriptionLang(descriptions, lang);
    if (resolvedLang) {
        payload.description = new Description(resolvedLang, descriptions[resolvedLang]);
    }
    return payload;
}

function buildMeta(page) {
    if (!page) {
        return {};
    }
    return {
        revision: page.pageid,
        tid: mwapi.getRevisionFromExtract(page)
    };
}

/** @param {!domino.Document} doc
    @return {void} */
function removeLangLabels(doc) {
    const labels = doc.querySelectorAll('span[class*=langlabel-]') || [];
    labels.forEach((element) => {
        element.parentNode.removeChild(element);
    });
}

/** @param {!domino.Document} doc
    @return {!Object.<string, string>} Map of languages to descriptions */
function queryDescriptions(doc) {
    const descriptions = {};
    const descriptionElements = doc.querySelectorAll('.description[class*=lang-]') || [];
    descriptionElements.forEach((element) => {
        descriptions[element.lang] = element.innerHTML.trim();
    });
    return descriptions;
}

function promise(app, req) {
    const aggregated = !!req.query.aggregated;

    if (!dateUtil.validate(dateUtil.hyphenDelimitedDateString(req))) {
        if (aggregated) {
            return BBPromise.resolve({ meta: {} });
        }
        dateUtil.throwDateError();
    }

    const lang = mUtil.getLanguageFromDomain(req.params.domain);
    let ret;
    return requestPictureOfTheDay(app, dateUtil.getRequestedDate(req),
        aggregated)
    .then((response) => {
        mwapi.checkForQueryPagesInResponse(req, response);
        const page = getPageObject(response);
        ret = {
            payload: buildPayload(page, lang),
            meta: buildMeta(page)
        };

        const parsoidReq = Object.create(req);
        parsoidReq.params = Object.create(req.params);
        parsoidReq.params.title = page.title;
        parsoidReq.params.domain = COMMONS_URL;
        return parsoid.getParsoidHtml(app, parsoidReq);
    }).then((response) => {
        const doc = domino.createDocument(response.body);
        removeLangLabels(doc);
        const descriptions = queryDescriptions(doc);

        // todo: should we just send all langs like parsoid does?
        const resolvedLang = pickDescriptionLang(descriptions, lang);
        if (resolvedLang && (resolvedLang === lang || !ret.payload.description)) {
            ret.payload.description = new Description(resolvedLang, descriptions[resolvedLang]);
        }
        return ret;
    }).catch((err) => {
        if (err.status === 504) {
            if (aggregated) {
                return BBPromise.resolve({ meta: {} });
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
    promise
};
