'use strict';

const domino = require( 'domino' );
const assert = require( '../../utils/assert' );
const transforms = require( '../../../lib/transforms' );

// https://en.wikipedia.org/api/rest_v1/page/html/Barack_Obama/827516503
const html = '<h2 id="Presidency_(2009–2017)">' +
               '<span id="Presidency_.282009.E2.80.932017.29" typeof="mw:FallbackId"></span>' +
               'Presidency (2009–2<!--Do not remove "20", per MOS-->017)' +
             '</h2>';

describe( 'transforms:stripUnneededMetadataMarkup', () => {
	it( 'strips comments', () => {
		const doc = domino.createDocument( html );
		transforms.stripUnneededMetadataMarkup( doc );
		assert.notContains( doc.body.textContent, '<!--Do not remove "20", per MOS-->' );
	} );

	it( 'strips span[typeof=mw:FallbackId]', () => {
		const doc = domino.createDocument( html );
		transforms.stripUnneededMetadataMarkup( doc );
		assert.selectorDoesNotExist( doc, 'span[typeof=mw:FallbackId]' );
	} );

	it( 'strips span:empty', () => {
		const doc = domino.createDocument( html );
		transforms.stripUnneededMetadataMarkup( doc );
		assert.selectorDoesNotExist( doc, 'span:empty' );
	} );
} );
