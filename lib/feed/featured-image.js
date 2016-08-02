/**
 * To retrieve the picture of the day for a given date.
 */

'use strict';

var preq = require('preq');
var api = require('../api-util');
var dateUtil = require('../dateUtil');
var mwapi = require('../mwapi');
var mUtil = require('../mobile-util');
var sUtil = require('../util');
var HTTPError = sUtil.HTTPError;


/**
 * Builds the request to get the Picture of the day of a given date.
 *
 * @param {Object} app the application object
 * @param {String} domain the requested domain, e.g. 'de.wikipedia.org'
 * @param {Date} date for which day the featured image of theday is requested
 * @return {Promise} a promise resolving as an JSON object containing the response
 */
function requestPictureOfTheDay(app, domain, date) {
    var isoDate = dateUtil.formatISODate(date);
    var lang = mUtil.getLanguageFromDomain(domain);
    return api.mwApiGet(app, 'commons.wikimedia.org', {
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
    var page = response.body.query.pages[0];
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

    let ret = {
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

function promise(app, req, dontThrow) {
    dateUtil.validate(dateUtil.hyphenDelimitedDateString(req));
    return requestPictureOfTheDay(app, req.params.domain, dateUtil.getRequestedDate(req), dontThrow)
    .then(function (response) {
        mwapi.checkForQueryPagesInResponse(req, response);
        var page = getPageObject(response);
        return {
            payload: buildPayload(page, mUtil.getLanguageFromDomain(req.params.domain)),
            meta: {
                etag: buildEtag(page)
            }
        };
    }).catch(function(err) {
        if (err.status === 504) {
            if (dontThrow) {
                return { payload: undefined, meta: undefined };
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
