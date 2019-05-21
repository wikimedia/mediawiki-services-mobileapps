'use strict';

const P = require('bluebird');
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
 * Converts a metadata array to a standard JS key-value object.
 * @param {!Object[]} meta A metadata array from Commons ([ { name: foo, value: bar }, ... ])
 * @return {!Object} a consolidated object ({ foo: bar, ... })
 */
function metadataToObject(meta) {
    return Object.assign(...meta.map(item => ({ [item.name]: item.value })));
}

/**
 * Provides a consistent structure for extended metadata (extmetadata) properties returned from the
 * MW API.  As returned directly from the MW API, these values may be strings or objects, and may
 * or may not specify the language in which they are provided.  This provides some structure to help
 * clients consume the data more easily.
 * The result language will be chosen according to the following algorithm:
 * 1) If a key for preferredLang exists, use preferredLang;
 * 2) Else, if the key exists in English, use English;
 * 3) Else, use the first available language.
 * The return value will include the following properties:
 * html (required): the original value text in the chosen language, likely (but not necessarily)
 *   HTML-formatted;
 * text (required): the original value text with HTML-formatting stripped;
 * lang (optional): the chosen language code, if language codes were provided

 * @param  {!Object|string} val Value of the extmetadata property
 * @param  {!string} preferredLang preferred language (most likely the request language)
 * @return {?Object} structured values for the extmetadata property
 */
function structureExtMetadataValue(val, preferredLang) {
    let html;
    let lang;

    if (typeof val === 'object') {
        if (val[preferredLang]) {
            lang = preferredLang;
        } else if (val.en) {
            lang = 'en';
        } else if (Object.keys(val)[0]) {
            lang = Object.keys(val)[0];
        } else {
            return;
        }
        html = val[lang];
    } else if (typeof val === 'string') {
        html = val;
    } else {
        return;
    }

    return {
        html,
        text: striptags(html).trim(),
        lang
    };
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
 * @param {!Object|string} val The Artist value from extmetadata
 * @param {!string} preferredLang "artist" metadata value from the MW API
 * @return {?Object} structured artist info
 */
function getStructuredArtistInfo(val, preferredLang) {
    const result = structureExtMetadataValue(val, preferredLang);
    if (!result) {
        return;
    }
    const doc = domino.createDocument(result.html);
    if (!doc.body.textContent) {
        return;
    }
    let name;
    let userPage;
    if (doc.body.textContent === result.html) {
        name = doc.body.textContent;
    } else {
        const a = doc.body.querySelector('a');
        if (a && a.outerHTML === result.html && a.getAttribute('title') === `User:${doc.body.textContent}`
            // TODO: Update to handle all Wikimedia project domains
            && a.getAttribute('href') === `//commons.wikimedia.org/wiki/${a.title}`) {
            name = doc.body.textContent;
            userPage = `https:${a.getAttribute('href')}`;
        }
    }
    return Object.assign(result, { name, user_page: userPage });
}

/**
 * Provides consistent structuring of extmetadata values. See comments on
 * structureExtMetadataProperty for the specific steps applied to each value.
 * @param {!Object} extMetadata extmetadata object from MW API
 * @param {!string} preferredLang preferred language (most likely the request language)
 * @return {?Object} set of structured extmetadata values
 */
function structureExtMetadataValues(extMetadata, preferredLang) {
    return Object.keys(extMetadata).reduce((acc, cur) => {
        const val = extMetadata[cur].value;
        if (cur === 'Artist') {
            // Special-case handling for the Artist property (conditionally including a
            // derived Commons username and User page URL), which is used for something
            // or other in the Android app.
            acc[cur] = getStructuredArtistInfo(val, preferredLang);
        } else {
            acc[cur] = structureExtMetadataValue(val, preferredLang);
        }
        return acc;
    }, {});
}

/**
 * Make image info result
 * @param {?Object[]} ids query results for Commons page ids (for media endpoint)
 * @param {!Object[]} meta metadata query results to be parsed and formatted
 * @param {!Object} siteinfo Site info
 * @param {!string} preferredLang language code of the preferred language for metadata values
 * @param {?Object} desc Description Value pre-processed (needed for Picture of the day)
 * @return {!Object} Object of items identified by canonical title
 */
function makeResults(ids, meta, siteinfo, preferredLang, desc = null) {
    const idLookup = ids && ids.reduce((acc, cur) => {
        if (cur.pageid) {
            acc[cur.title] = cur;
        }
        return acc;
    }, {});

    return meta.filter(item => item.imageinfo).map((item) => {
        const imageInfo = item.imageinfo[0];
        const meta = imageInfo.metadata && metadataToObject(imageInfo.metadata);
        const ext = imageInfo.extmetadata
            && structureExtMetadataValues(imageInfo.extmetadata, preferredLang);
        const isAudio = imageInfo.mediatype === 'AUDIO';
        const isSvg = imageInfo.mime && imageInfo.mime.includes('svg');
        const canonicalTitle = mwapi.getDbTitle(item.title, siteinfo);

        return {
            titles: {
                canonical: canonicalTitle,
                normalized: item.title,
                display: item.pageprops && item.pageprops.displaytitle || item.title
            },
            thumbnail: {
                source: imageInfo.thumburl,
                width: imageInfo.thumbwidth,
                height: imageInfo.thumbheight,
                mime: imageInfo.thumbmime
            },
            original: {
                source: imageInfo.url,
                width: isAudio || isSvg ? undefined : imageInfo.width,
                height: isAudio || isSvg ? undefined : imageInfo.height,
                mime: imageInfo.mime,
            },
            page_count: imageInfo.pagecount,
            file_page: imageInfo.descriptionurl,
            duration: meta && (meta.length || meta.playtime_seconds) || undefined,
            artist: ext && ext.Artist,
            credit: ext && ext.Credit,
            // Use original value for each of these since it's well standardized data
            license: {
                type: ext && ext.LicenseShortName && ext.LicenseShortName.html,
                code: ext && ext.License && ext.License.html,
                url: ext && ext.LicenseUrl && ext.LicenseUrl.html
            },
            description: desc && structureExtMetadataValue(desc) || ext && ext.ImageDescription,
            wb_entity_id: idLookup && idLookup[item.title] && `M${idLookup[item.title].pageid}`
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
        const description = getPotdDescriptionValue(req, response.body);
        const lang = req.params.domain[0];
        const potd = _.values(makeResults(undefined, [page], siteinfo, lang, description))[0];

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
    const preferredLang = req.params.domain[0];

    const imageInfoProps = [
        'url',
        'mime',
        'size',
        'thumbmime',
        'metadata', // needed for 'duration' (is this really necessary?)
        'extmetadata'
    ];

    const metaDataQuery = {
        action: 'query',
        format: 'json',
        formatversion: 2,
        prop: 'imageinfo|pageprops',
        iiprop: imageInfoProps.join('|'),
        iiurlwidth: DEFAULT_THUMB_SIZE,
        iimetadataversion: 'latest',
        iiextmetadatamultilang: '',
        continue: ''
    };

    // Pass clones (.slice(0)) of titles to both MW API calls, to prevent it from being consumed by
    // the first before the second gets to it...
    return P.join(
        api.mwApiGetBatched(app, 'commons.wikimedia.org', { action: 'query' }, titles.slice(0)),
        api.mwApiGetBatched(app, req.params.domain, metaDataQuery, titles.slice(0)),
        (ids, meta) => makeResults(ids, meta, siteinfo, preferredLang));
}

module.exports = {
    getMetadataFromApi,
    getStructuredArtistInfo,
    requestPictureOfTheDay,
    testing: {
        structureExtMetadataValue,
        makeResults
    }
};
