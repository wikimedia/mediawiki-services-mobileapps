'use strict';

const assert = require( '../../utils/assert.js' );
const domino = require( 'domino' );
const lib = require( '../../../lib/references/moveReferenceListStyles' );
const moveReferenceListStyles = lib.moveReferenceListStyles;

describe( 'lib:moveReferenceListStyles', () => {
	it( 'empty document', () => {
		const doc = domino.createDocument( '' );

		moveReferenceListStyles( doc );
		assert.selectorExistsNTimes( doc, 'ol.mw-references style', 0 );
	} );

	it( 'one list, one template style', () => {
		const doc = domino.createDocument(
			'<ol typeof="mw:Extension/references" class="mw-references references">' +
            '<li><span>foo A1</span><cite>foo</cite>' +
            '<style data-mw-deduplicate="123"></style>' +
            '</li>' +
            '</ol>' );

		assert.selectorExistsNTimes( doc, 'ol.mw-references style', 1 );
		moveReferenceListStyles( doc );
		assert.selectorExistsNTimes( doc, 'ol.mw-references style', 0 );
		assert.selectorExistsNTimes( doc, 'style', 1 );
	} );

	it( 'style outside ref list stays', () => {
		const doc = domino.createDocument(
			'<style data-mw-deduplicate="123"></style>' +
            '<ol typeof="mw:Extension/references" class="mw-references references">' +
            '<li><span>foo A1</span><cite>foo</cite></li>' +
            '</ol>' );

		assert.selectorExistsNTimes( doc, 'ol.mw-references style', 0 );
		assert.selectorExistsNTimes( doc, 'style', 1 );
		moveReferenceListStyles( doc );
		assert.selectorExistsNTimes( doc, 'ol.mw-references style', 0 );
		assert.selectorExistsNTimes( doc, 'style', 1 );
	} );

	it( 'one list, two template styles; +basic deduplication', () => {
		const doc = domino.createDocument(
			'<ol typeof="mw:Extension/references" class="mw-references references">' +
            '<li><span>foo A1</span><cite>foo</cite>' +
            '<style data-mw-deduplicate="123"></style>' +
            '</li>' +
            '<li><span>foo A2</span><cite>foo</cite>' +
            '<style data-mw-deduplicate="123"></style>' +
            '</li>' +
            '</ol>' );

		assert.selectorExistsNTimes( doc, 'ol.mw-references style', 2 );
		moveReferenceListStyles( doc );
		assert.selectorExistsNTimes( doc, 'ol.mw-references style', 0 );
		assert.selectorExistsNTimes( doc, 'style', 1 );
	} );

	it( 'two lists, two template styles; +basic deduplication', () => {
		const doc = domino.createDocument(
			'<ol typeof="mw:Extension/references" class="mw-references references">' +
            '<li><span>foo A1</span><cite>foo</cite>' +
            '<style data-mw-deduplicate="123"></style>' +
            '</li>' +
            '<li><span>foo A2</span><cite>foo</cite>' +
            '<style data-mw-deduplicate="123"></style>' +
            '</li>' +
            '</ol>' +
            '<ol typeof="mw:Extension/references" class="mw-references references">' +
            '<li><span>foo B1</span><cite>foo</cite>' +
            '<style data-mw-deduplicate="123"></style>' +
            '</li>' +
            '<li><span>foo B2</span><cite>foo</cite>' +
            '<style data-mw-deduplicate="123"></style>' +
            '</li>' +
            '</ol>'
		);

		assert.selectorExistsNTimes( doc, 'ol.mw-references style', 4 );
		moveReferenceListStyles( doc );
		assert.selectorExistsNTimes( doc, 'ol.mw-references style', 0 );
		assert.selectorExistsNTimes( doc, 'style', 1 );
	} );
} );
