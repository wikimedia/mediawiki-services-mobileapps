/**
 * To retrieve the picture of the day for a given date.
 */

'use strict';

const BBPromise = require('bluebird');
const api = require('../api-util');
const dateUtil = require('../dateUtil');
const domino = require('domino');
const mwapi = require('../mwapi');
const parsoid = require('../parsoid-access');
const sUtil = require('../util');
const HTTPError = sUtil.HTTPError;

const COMMONS_URL = 'commons.wikimedia.org';
const DESCRIPTION_FALLBACK_LANG = 'en';

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
 * @param {!Object} app the application object
 * @param {!Date} date for which day the featured image of theday is requested
 * @return {!Promise} a promise resolving as an JSON object containing the response
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
        iiprop: 'url|dimensions',
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
/**
 * POTD description language from Parsoid HTML, if available.
 * @param {?Object} descriptions POTD descriptions via the Picture of the Day template,
 *   parsed from the page HTML. Requires that the input be an object of the form
 *   { "en": "foo", "de": "bar" }.
 * @param {!string} preferredLang the desired description language
 * @return {?Description} the resolved caption, if available
 */
function getDescription(descriptions, preferredLang) {
    if (!(descriptions && typeof (descriptions) === 'object')) {
        return;
    }

    if (descriptions[preferredLang]) {
        return new Description(preferredLang, descriptions[preferredLang]);
    }

    if (descriptions[DESCRIPTION_FALLBACK_LANG]) {
        return new Description(DESCRIPTION_FALLBACK_LANG, descriptions[DESCRIPTION_FALLBACK_LANG]);
    }
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

function promise(app, req, lang) {
    const aggregated = !!req.query.aggregated;

    if (!dateUtil.validate(dateUtil.hyphenDelimitedDateString(req))) {
        if (aggregated) {
            return BBPromise.resolve({ meta: {} });
        }
        dateUtil.throwDateError();
    }

    let ret;
    return requestPictureOfTheDay(app, dateUtil.getRequestedDate(req), aggregated)
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
        ret.payload.description = getDescription(queryDescriptions(doc), lang);
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
        } else {
            throw err;
        }
    });
}

module.exports = {
    promise,
    testing: {
        getDescription
    }
};
