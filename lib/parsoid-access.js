/**
 * Accessing Parsoid output
 */

'use strict';

const domino = require( 'domino' );
const mUtil = require( './mobile-util' );
const api = require( './api-util' );
const parseProperty = require( './parseProperty' );
const parsoidSections = require( './sections/parsoidSections' );
const transforms = require( './transforms' );

/**
 * Generic function to get page content from the REST API.
 * @param {!Object} app the application object
 * @param {!Object} req the request object
 * @param {!string} endpoint the content desired, e.g., 'html', 'mobile-sections'
 * @return {!promise} Promise for the requested content
 */
function _getRestPageContent( app, req, endpoint, spec ) {
	const rev = req.params.revision;
	let suffix = '';
	if ( rev ) {
		suffix = `/${rev}`;
		const tid = req.params.tid;
		if ( tid ) {
			suffix += `/${tid}`;
		}
	}
	const domain = req.params.domain.replace( /^(\w+\.)m\./, '$1' );
	const path = `page/${endpoint}/${encodeURIComponent( req.params.title )}${suffix}`;
	const restReq = { headers: {
		accept: mUtil.getContentTypeString( spec ),
		'accept-language': req.headers[ 'accept-language' ]
	} };
	return api.restApiGet( app, domain, path, restReq );
}

/**
 * @param {!Object} app the application object
 * @param {!Object} req the request object
 * @return {!promise} Promise for the raw Parsoid HTML of the given page/rev/tid
 */
function getParsoidHtml( app, req ) {
	return _getRestPageContent( app, req, 'html', mUtil.CONTENT_TYPES.html );
}

/**
 * @param {!Object} app the application object
 * @param {!Object} req the request object
 * @return {!promise} Promise for the mobile-sections-lead response for the given page/rev/tid
 */
function getMobileSectionsLead( app, req ) {
	// eslint-disable-next-line max-len
	return _getRestPageContent( app, req, 'mobile-sections-lead', mUtil.CONTENT_TYPES.mobileSections );
}

/**
 * Retrieves the etag from the headers if present. Strips the weak etag prefix (W/) and enclosing
 * quotes.
 * @param {?Object} headers an object of header name/values
 * @return {?string} etag
 */
function getEtagFromHeaders( headers ) {
	if ( headers && headers.etag ) {
		return headers.etag.replace( /^W\//, '' ).replace( /"/g, '' );
	}
}

/**
 * Retrieves the revision from the etag emitted by Parsoid.
 * @param {?Object} headers an object of header name/values
 * @return {?string} revision portion of etag, if found
 */
function getRevisionFromEtag( headers ) {
	const etag = getEtagFromHeaders( headers );
	if ( etag ) {
		return etag.split( '/' ).shift();
	}
}

/**
 * Retrieves the revision and tid from the etag emitted by Parsoid.
 * @param {?Object} headers an object of header name/values
 * @return {?Object} revision and tid from etag, if found
 */
function getRevAndTidFromEtag( headers ) {
	const etag = getEtagFromHeaders( headers );
	if ( etag ) {
		const etagComponents = etag.split( '/' );
		return {
			revision: etagComponents[ 0 ],
			tid: etagComponents[ 1 ]
		};
	}
}

/**
 * <meta property="dc:modified" content="2015-10-05T21:35:32.000Z"/>
 * @param {!Document} doc Parsoid DOM document
 */
function getModified( doc ) {
	return doc.querySelector( 'head > meta[property="dc:modified"]' ).getAttribute( 'content' )
		.replace( /\.000Z$/, 'Z' );
}

/**
 * Gets the base URI from a Parsoid document
 * <base href="//en.wikipedia.org/wiki/"/>
 * @param {!Document} doc Parsoid DOM document
 */
function getBaseUri( doc ) {
	return doc.querySelector( 'html > head > base' ).getAttribute( 'href' );
}

/**
 * Gets the title of the current page from a Parsoid document. This title string usually differs
 * from normalized titles in that it has spaces replaced with underscores.
 * Example: given a Parsoid document with
 * <link rel="dc:isVersionOf" href="//en.wikipedia.org/wiki/Hope_(painting)"/> and
 * <base href="//en.wikipedia.org/wiki/"/> this function returns the string 'Hope_(painting)'.
 * @param {!Document} doc Parsoid DOM document
 */
function getParsoidLinkTitle( doc ) {
	const href = doc.querySelector( 'html > head > link[rel="dc:isVersionOf"]' ).getAttribute( 'href' );
	const baseUri = getBaseUri( doc );
	return decodeURIComponent( href.replace( new RegExp( `^${baseUri}` ), '' ) );
}

/**
 * @param {!Object} app the application object
 * @param {!Object} req the request object
 * @return {!promise} Returns a promise to retrieve the page content from Parsoid
 */
function pageJsonPromise( app, req ) {
	return getParsoidHtml( app, req )
		.then( ( response ) => {
			const page = getRevAndTidFromEtag( response.headers );
			const doc = domino.createDocument( response.body );

			// Note: these properties must be obtained before stripping markup
			page.lastmodified = getModified( doc );
			page.pronunciation = parseProperty.parsePronunciation( doc );
			page.spoken = parseProperty.parseSpokenWikipedia( doc );
			page.hatnotes = transforms.extractHatnotesForMobileSections( doc );
			page.issues = transforms.extractPageIssuesForMobileSections( doc );

			transforms.pcs.relocateFirstParagraph( doc );
			transforms.shortenPageInternalLinks( doc, getParsoidLinkTitle( doc ) );
			transforms.addRequiredMarkup( doc );
			transforms.flattenElements( doc, 'sup.mw-ref', [ 'class', 'id' ] );
			transforms.stripUnneededMarkup( doc );
			transforms.stripUnwantedWikiContentForApp( doc );

			page.sections = parsoidSections.getSectionsText( doc, req.logger );
			page._headers = {
				'Content-Language': response.headers && response.headers[ 'content-language' ],
				Vary: response.headers && response.headers.vary
			};
			return page;
		} );
}

/**
 * @param {!Object} app the application object
 * @param {!Object} req the request object
 * @param {?boolean} [optimized] if true will apply additional transformations
 * to reduce the payload
 * @return {!promise} Returns a promise to retrieve the page content from Parsoid
 */
function pageHtmlPromise( app, req, optimized ) {
	return getParsoidHtml( app, req )
		.then( ( response ) => {
			const meta = getRevAndTidFromEtag( response.headers );
			const doc = domino.createDocument( response.body );

			if ( optimized ) {
				transforms.runPcsTransforms(
					doc,
					api.getExternalRestApiUri( app, req.params.domain ),
					getParsoidLinkTitle( doc ) );
			}

			meta._headers = {
				'Content-Language': response.headers && response.headers[ 'content-language' ],
				Vary: response.headers && response.headers.vary
			};

			const html = doc.outerHTML;
			return { meta, html };
		} );
}

/**
 * @param {!Object} app the application object
 * @param {!Object} req the request object
 * @return {!promise} Returns a promise to retrieve the page content from Parsoid
 */
function pageHtmlPromiseForReferences( app, req ) {
	return getParsoidHtml( app, req )
		.then( ( response ) => {
			const meta = getRevAndTidFromEtag( response.headers );
			const doc = domino.createDocument( response.body );

			meta._headers = {
				'Content-Language': response.headers && response.headers[ 'content-language' ],
				Vary: response.headers && response.headers.vary
			};

			transforms.stripUnneededReferenceMarkup( doc );
			return { meta, doc };
		} );
}

module.exports = {
	pageJsonPromise,
	pageHtmlPromise,
	pageHtmlPromiseForReferences,
	getParsoidHtml,
	getMobileSectionsLead,
	getRevisionFromEtag,
	getRevAndTidFromEtag,
	getModified,

	// VisibleForTesting
	getBaseUri,
	getParsoidLinkTitle,
	getEtagFromHeaders
};
