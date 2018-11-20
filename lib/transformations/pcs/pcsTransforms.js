'use strict';

const addSectionEditButtons = require( './addSectionEditButtons' ).addSectionEditButtons;
const adjustThumbWidths = require( './adjustThumbWidths' );
const head = require( './head' );
const hideRedLinks = require( './hideRedLinks' );
const lazyLoadImagePrep = require( './lazyLoadImagePrep' );
const prepForTheme = require( './prepForTheme' );
const relocateFirstParagraph = require( './relocateFirstParagraph' );
const widenImages = require( './widenImages' );

/**
 * Runs the DOM transformations for the PCS mobile-html endpoint.
 * @param {!Document} doc Parsoid DOM document
 * @param {!string} restApiBaseUri the base URI for RESTBase for the request domain,
 *        e.g. 'https://en.wikipedia.org/api/rest_v1/'
 * @param {!string} linkTitle the title of the page that can be used to link to it
 */
const runPcsTransforms = ( doc, restApiBaseUri, linkTitle ) => {
	hideRedLinks( doc );
	adjustThumbWidths( doc );
	prepForTheme( doc );
	relocateFirstParagraph( doc );
	addSectionEditButtons( doc, linkTitle );
	widenImages( doc );
	lazyLoadImagePrep( doc );
	head.addCssLinks( doc, restApiBaseUri );
	head.addMetaViewport( doc );
	head.addPageLibJs( doc );
};

module.exports = {
	runPcsTransforms,
	relocateFirstParagraph
};
