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
const mwapiConstants = require('./mwapi-constants');

const DEFAULT_THUMB_SIZE = 320;

const structuredCaptionsQuery = {
    action: 'wbgetentities',
    format: 'json',
    formatversion: 2,
    sites: 'commonswiki',
    props: 'labels|info',
};

/**
 * get page object from api response
 *
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
 * Converts a metadata array to a standard JS key-value object.
 *
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
 *
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
 *
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
 * Provides consistent structuring of wbentities values for the structured captions field
 *
 * @param  {!Object} wbentity object data from wbgetentities API action
 * @return {!Object}          structured captions for given wbentity
 */
function structureCaptions(wbentity) {
    const captions = wbentity && wbentity.labels;
    if (captions) {
        Object.keys(captions).map(index => {
            captions[index] = captions[index].value;
        });
    }
    return captions;
}

/**
 * Make image info result
 *
 * @param {?Object} ids query results for Commons page ids (for media endpoint)
 * @param {!Object[]} wbentities mediainfo entities from SDC (wbgetentities)
 * @param {!Object} meta metadata query results to be parsed and formatted
 * @param {!Object} siteinfo Site info
 * @param {!string} preferredLang language code of the preferred language for metadata values
 * @param {?Object} desc Description Value pre-processed (needed for Picture of the day)
 * @return {!Object} Object of items identified by canonical title
 */
function makeResults(ids, wbentities, meta, siteinfo, preferredLang, desc = null) {
    if (!meta || !meta.pages) {
        return {};
    }
    const idLookup = ids && ids.pages && ids.pages.reduce((acc, cur) => {
        if (cur.pageid) {
            acc[cur.title] = cur;
        }
        return acc;
    }, {});
    return meta.pages.filter(item => item.imageinfo).map((item) => {
        const imageInfo = item.imageinfo[0];
        const meta = imageInfo.metadata && metadataToObject(imageInfo.metadata);
        const ext = imageInfo.extmetadata
            && structureExtMetadataValues(imageInfo.extmetadata, preferredLang);
        const isAudio = imageInfo.mediatype === 'AUDIO';
        const isSvg = imageInfo.mime && imageInfo.mime.includes('svg');
        const canonicalTitle = mwapi.getCanonicalFileTitle(mwapi.getDbTitle(item.title, siteinfo));
        const lookupTitle = mwapi.getCanonicalFileTitle(item.title);
        const wb_entity_id = idLookup && idLookup[lookupTitle] && `M${idLookup[lookupTitle].pageid}`;
        const wbentity = wbentities && wbentities[0] && wbentities[0][wb_entity_id];
        const captions = structureCaptions(wbentity);

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
            wb_entity_id,
            structured: {
                captions:  captions && Object.keys(captions).length ? captions : {},
            }
        };
    }).reduce((res, item) => Object.assign(res, { [item.titles.canonical]: item }), {});
}

/**
 * Normalize response for Featured Image endpoint
 *   1) title = titles.display && remove title
 *   2) rename original to image
 *
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
 *
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
 *
 * @param  {[type]} req      [description]
 * @param {!Date} date for which day the featured image of theday is requested
 * @param  {[type]} siteinfo [description]
 * @return {!Promise} a promise resolving as an JSON object containing the response
 */
function requestPictureOfTheDay(req, date, siteinfo) {
    const commonsDomain = api.getCommonsDomain(req.params.domain);
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
        iiurlwidth: mwapiConstants.CARD_THUMB_FEATURE_SIZE,
        rawcontinue: '',
        titles: `Template:Potd/${isoDate}`
    };

    return api.mwApiGet(req, query, commonsDomain).then((response) => {
        mwapi.checkForQueryPagesInResponse(req, response);
        page = getPageObject(response);

        const parsoidReq = Object.create(req);
        parsoidReq.params = Object.create(req.params);
        parsoidReq.params.title = page.title;
        parsoidReq.params.domain = commonsDomain;

        const structuredQuery = Object.assign(structuredCaptionsQuery, { titles: page.title });

        return P.join(
            parsoid.getParsoidHtml(parsoidReq),
            api.mwApiGet(req, structuredQuery, commonsDomain),
            (html, structured) => {
                const description = getPotdDescriptionValue(req, html.body);
                const lang = req.params.domain[0];
                const entities = structured.body.entities;
                const results = makeResults([page], [entities],[page], siteinfo, lang,
                    description);
                const potd = _.values(results)[0];

                return {
                    payload: normalizePotdResponse(potd),
                    meta: parsoid.getRevAndTidFromEtag(html.headers)
                };
            });
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
function getMetadataFromApi(req, titles, siteinfo) {
    const preferredLang = req.params.domain[0];
    const commonsDomain = api.getCommonsDomain(req.params.domain);

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
        api.mwApiGetQueryBatched(req, { action: 'query' }, titles.slice(0), commonsDomain),
        api.mwApiGetEntitiesBatched(req, structuredCaptionsQuery, titles.slice(0), commonsDomain),
        api.mwApiGetQueryBatched(req, metaDataQuery, titles.slice(0)),
        (ids, structured, meta) => makeResults(ids, structured, meta, siteinfo, preferredLang));
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
