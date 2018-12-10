'use strict';

const _ = require('underscore');
const domino = require('domino');
const striptags = require('striptags');
const api = require('./api-util');
const mwapi = require('./mwapi');
const dateUtil = require('./dateUtil');
const HTTPError = require('./util').HTTPError;
const parsoid = require('./parsoid-access');

const COMMONS_URL = 'commons.wikimedia.org';
const DEFAULT_THUMB_SIZE = 320;

/**
 * get page object from api response
 * @param  {Object} response  MWAPI response
 * @param  {Bool} dontThrow if true throw HTTP error 404
 * @return {Object}           Page Object
 */
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

/**
 * Build meta property
 * @param  {Object} page Page object
 * @return {Object}      meta response
 */
function buildMeta(page) {
    if (!page) {
        return {};
    }
    return {
        revision: page.pageid,
        tid: mwapi.getRevisionFromExtract(page)
    };
}

/**
 * Get Html for the right lang requested, fallback to 'en' or default language if none found
 * @param  {Object} req         req Server request
 * @param  {Object} metadataObj Metadata Object
 * @return {Object}             object with html and lang
 */
function getHtmlWithLang(req, metadataObj) {
    let lang;
    if (metadataObj[req.params.domain.split('.')[0]]) {
        lang = req.params.domain.split('.')[0];
    } else if (metadataObj.en) {
        lang = 'en';
    } else {
        lang = Object.keys(metadataObj)[0];
    }
    return { html: metadataObj[lang], lang };
}

/**
 * Get structured artist info from extmetadata (to the extent possible).
 * We take a rather conservative approach here:
 * 1) In the 'html' property, we always return the full HTML string.
 * 2) If the field contains only plain text, we assume this is an artist name and
 *    return it in the 'name' property.
 * 3) If the HTML string is of a specific common form, we parse the user name and
 *    user page from it, and return them in the 'name' and 'user_page' fields respectively.
 *    That form is "<a href=\"//commons.wikimedia.org/wiki/User:Foo\" title=\"User:Foo\">Foo</a>".
 * @param {!Object} req The request object
 * @param {?string|Object} artistValue "artist" metadata value from the MW API
 * @return {!Object} structured artist info
 */
function getStructuredArtistInfo(req, artistValue) {
    let html;
    let lang;
    if (typeof artistValue === 'object') {
        const htmlWithLang = getHtmlWithLang(req, artistValue);
        html = htmlWithLang.html;
        lang = htmlWithLang.lang;
    } else if (typeof artistValue === 'string') {
        html = artistValue;
    } else {
        return;
    }
    const doc = domino.createDocument(html);
    if (!doc.body.textContent) {
        return;
    }
    let name;
    let userPage;
    if (doc.body.textContent === html) {
        name = doc.body.textContent;
    } else {
        const a = doc.body.querySelector('a');
        if (a && a.outerHTML === html && a.getAttribute('title') === `User:${doc.body.textContent}`
            // TODO: Update to handle all Wikimedia project domains
            && a.getAttribute('href') === `//commons.wikimedia.org/wiki/${a.title}`) {
            name = doc.body.textContent;
            userPage = `https:${a.getAttribute('href')}`;
        }
    }
    return { html, lang, name, user_page: userPage };
}

/**
 * Converts a metadata array to a standard JS key-value object.
 * @param {!Object[]} meta A metadata array from Commons ([ { name: foo, value: bar }, ... ])
 * @return {!Object} a consolidated object ({ foo: bar, ... })
 */
function metadataToObject(meta) {
    return Object.assign(...meta.map(item => ({ [item.name]: item.value })));
}

/**
 * Get the image description structured and formatted
 * @param  {Object} req Server request
 * @param  {Object} descriptionValue description value pre-generated
 * @return {Object} description
 */
function getDescription(req, descriptionValue) {
    let description;
    let lang;
    if (descriptionValue) {
        if (typeof descriptionValue === 'object' && Object.keys(descriptionValue).length) {
            const htmlWithLang = getHtmlWithLang(req, descriptionValue);
            description = htmlWithLang.html;
            lang = htmlWithLang.lang;
        } else if (typeof descriptionValue === 'string') {
            description = descriptionValue;
        }
    }

    return description && {
        html: description,
        text: striptags(description),
        lang
    };
}

/**
 * Make image info result
 * @param  {Object} req       reqServer request
 * @param  {Object} items     items to be parsed and formatted
 * @param  {Object} siteinfo  Site info
 * @param  {Object} descValue Description Value pre-processed (needed for Picture of the day)
 * @return {Object}           Object of items identifeid by its canonical title
 */
function makeResults(req, items, siteinfo, descValue = null) {
    return items.map((item) => {
        const info =  item.imageinfo[0];
        const meta = info.metadata && metadataToObject(info.metadata);
        const ext = info.extmetadata;
        const isAudio = info.mediatype === 'AUDIO';
        const isSvg = info.mime && info.mime.includes('svg');
        const canonicalTitle = mwapi.getDbTitle(item.title, siteinfo);
        const artist = ext && ext.Artist && getStructuredArtistInfo(req, ext.Artist.value);
        const description = descValue ||
            (ext && ext.ImageDescription && ext.ImageDescription.value);

        return {
            titles: {
                canonical: canonicalTitle,
                normalized: item.title,
                display: item.pageprops && item.pageprops.displaytitle || item.title
            },
            thumbnail: {
                source: info.thumburl,
                width: info.thumbwidth,
                height: info.thumbheight,
                mime: info.thumbmime
            },
            original: {
                source: info.url,
                width: isAudio || isSvg ? undefined : info.width,
                height: isAudio || isSvg ? undefined : info.height,
                mime: info.mime,
            },
            page_count: info.pagecount,
            file_page: info.descriptionurl,
            duration: meta && (meta.length || meta.playtime_seconds) || undefined,
            artist,
            credit: ext && ext.Credit && ext.Credit.value,
            license: {
                type: ext && ext.LicenseShortName && ext.LicenseShortName.value,
                code: ext && ext.License && ext.License.value,
                url: ext && ext.LicenseUrl && ext.LicenseUrl.value
            },
            description: getDescription(req, description),
        };
    }).reduce((res, item) => Object.assign(res, { [item.titles.canonical]: item }), {});
}

/**
 * Normalize response for Featured Image endpoint
 *   1) title = titles.display && remove title
 *   2) rename original to image
 * @param  {Object} potd Picture of the day returned from makeResults()
 * @return {Object}      POTD normalized and compativle with featured image spec
 */
function normalizePotdResponse(potd) {
    potd.title = potd.titles.display;
    delete potd.titles;

    potd.image = potd.original;
    delete potd.original;

    return potd;
}

/**
 * Get Picture of the day description from Parsoid response
 * @param  {Object} req  req Server request
 * @param  {Object} body parsoid body response
 * @return {Object}      POTD description value
 */
function getPotdDescriptionValue(req, body) {
    const doc = domino.createDocument(body);
    removeLangLabels(doc);
    return queryDescriptions(doc);
}

/**
 * Builds the request to get the Picture of the day of a given date.
 * @param {!Object} app the application object
 * @param  {[type]} req      [description]
 * @param {!Date} date for which day the featured image of theday is requested
 * @param  {[type]} siteinfo [description]
 * @return {!Promise} a promise resolving as an JSON object containing the response
 */
function requestPictureOfTheDay(app, req, date, siteinfo) {
    const isoDate = dateUtil.formatISODate(date);
    let page;
    const filter = [
        'Artist',
        'LicenseShortName',
        'License',
        'LicenseUrl',
        'Credit',
    ];

    const imageInfoProps = [
        'url',
        'dimensions',
        'extmetadata',
    ];

    const query = {
        action: 'query',
        format: 'json',
        formatversion: 2,
        generator: 'images',
        prop: 'imageinfo|revisions',
        iiextmetadatafilter: filter.join('|'),
        iiextmetadatamultilang: true,
        iimetadataversion: 'latest',
        iiprop: imageInfoProps.join('|'),
        iiurlwidth: mwapi.CARD_THUMB_FEATURE_SIZE,
        rawcontinue: '',
        titles: `Template:Potd/${isoDate}`
    };
    return api.mwApiGet(app, COMMONS_URL, query).then((response) => {
        mwapi.checkForQueryPagesInResponse(req, response);
        page = getPageObject(response);

        const parsoidReq = Object.create(req);
        parsoidReq.params = Object.create(req.params);
        parsoidReq.params.title = page.title;
        parsoidReq.params.domain = COMMONS_URL;

        return parsoid.getParsoidHtml(app, parsoidReq);
    }).then((response) => {
        const descriptionValue = getPotdDescriptionValue(req, response.body);
        const potd = _.values(makeResults(req, [page], siteinfo, descriptionValue))[0];

        return {
            payload: normalizePotdResponse(potd),
            meta: buildMeta(page),
        };
    });
}

/**
 * Gets metadata about media items from MW API.
 *
 * Batches requests by sets of 50 since we may be dealing with large title sets, and 50 titles is
 * the max we can specify at a time through the query title parameter.
 *
 * https://www.mediawiki.org/wiki/API:Query#Specifying_pages
 */
function getMetadataFromApi(app, req, titles, siteinfo) {
    const imageInfoProps = [
        'url',
        'mime',
        'size',
        'thumbmime',
        'metadata', // needed for 'duration' (is this really necessary?)
        'extmetadata'
    ];

    const query = {
        action: 'query',
        format: 'json',
        formatversion: 2,
        prop: 'imageinfo|pageprops',
        iiprop: imageInfoProps.join('|'),
        iiurlwidth: DEFAULT_THUMB_SIZE,
        iimetadataversion: 'latest',
        iiextmetadatamultilang: '',
        'continue': ''
    };

    return api.mwApiGetBatched(app, req.params.domain, query, titles).then((response) => {
        return makeResults(req, response, siteinfo);
    });
}

module.exports = {
    getMetadataFromApi,
    getStructuredArtistInfo,
    requestPictureOfTheDay,
    testing: {
        getDescription,
    }
};
