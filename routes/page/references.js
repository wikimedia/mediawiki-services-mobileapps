'use strict';

const mUtil = require( '../../lib/mobile-util' );
const parsoid = require( '../../lib/parsoid-access' );
const sUtil = require( '../../lib/util' );
const transforms = require( '../../lib/transforms' );

/**
 * The main router object
 */
const router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
let app;

/**
 * Build a response which contains a structure of reference sections
 * @param {!Object} meta metadata from Parsoid ETag header with revision and tid
 * @param {!Document} document the page content DOM Document (for the other properties)
 * @param {!Logger} logger a Bunyan logger
 * @return { reference_lists, references_by_id } an Object containing structured data of references
 */
function buildReferences( meta, document, logger ) {
	return Object.assign( meta, transforms.extractReferenceLists( document, logger ) );
}

/**
 * GET {domain}/v1/page/references/{title}{/revision}{/tid}
 * Gets any sections which are part of a reference sections for a given wiki page.
 */
router.get( '/references/:title/:revision?/:tid?', ( req, res ) => {
	return parsoid.pageHtmlPromiseForReferences( app, req )
		.then( ( response ) => {
			res.status( 200 );
			mUtil.setETag( res, response.meta.revision );
			mUtil.setContentType( res, mUtil.CONTENT_TYPES.references );
			mUtil.setLanguageHeaders( res, response.meta._headers );
			// Don't poison the client response with the internal _headers object
			delete response.meta._headers;
			res.json( buildReferences( response.meta, response.doc, req.logger ) ).end();
		} );
} );

module.exports = function ( appObj ) {
	app = appObj;
	return {
		path: '/page',
		api_version: 1,
		router
	};
};
