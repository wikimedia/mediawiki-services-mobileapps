'use strict';

const assert = require( 'assert' );
const domino = require( 'domino' );
const MobileHTML = require( '../../../lib/mobile/MobileHTML' );
const constants = require( '../../../lib/mobile/MobileHTMLConstants' );
const fixtures = require( '../../utils/fixtures' );
const pagelib = require( '../../../pagelib/build/wikimedia-page-library-transform' );
const path = require( 'path' );
const perf = require( '../../utils/performance' );
const Reference = require( '../../../lib/mobile/Reference' );
const PAGELIB_FIXTURES = 'pagelib/test/fixtures';

describe( 'lib:MobileHTML', () => {
	it( 'does not block the event loop', () => {
		const doc = fixtures.readIntoDocument( 'United_States.html' );
		const mobileHTMLPromise = MobileHTML.promise( doc );
		return perf.measure( mobileHTMLPromise, 1000 ).then( ( mobileHTML ) => {
			assert.equal( mobileHTML.doc.querySelector( 'section[data-mw-section-id="1"]' ).firstChild.outerHTML, '<div class="pcs-edit-section-header v2"><h2 id="Etymology" class="pcs-edit-section-title">Etymology</h2><span class="pcs-edit-section-link-container"><a href="/w/index.php?title=United_States&amp;action=edit&amp;section=1" data-id="1" data-action="edit_section" aria-labelledby="pcs-edit-section-aria-normal" class="pcs-edit-section-link"></a></span></div>' );
		} );
	} );
	it( 'encodes quotes in reference ids, and keeps back links to them', () => {
		const doc = domino.createDocument(
			'<section data-mw-section-id="0"><p>A' +
			'<sup class="mw-ref reference" id="cite_ref-O&#39;Brien_1-0">' +
			'<a href="./T#cite_note-O\'Brien-1">[1]</a></sup> B' +
			'<sup class="mw-ref reference" id="cite_ref-O&#39;Brien_1-1">' +
			'<a href="./T#cite_note-O\'Brien-1">[1]</a></sup></p>' +
			'<div class="mw-references-wrap"><ol class="mw-references references">' +
			'<li id="cite_note-O&#39;Brien-1" data-mw-footnote-number="1">' +
			'<span class="mw-cite-backlink"><a href="./T#cite_ref-O\'Brien_1-0">1</a> ' +
			'<a href="./T#cite_ref-O\'Brien_1-1">2</a></span> ' +
			'<span id="mw-reference-text-cite_note-O&#39;Brien-1" class="mw-reference-text">R</span></li>' +
			'</ol></div></section>' +
			'<section data-mw-section-id="1"><h2 id="Children&#39;s_books">H</h2></section>'
		);
		return MobileHTML.promise( doc, { linkTitle: 'T' } ).then( ( mobileHTML ) => {
			const out = mobileHTML.doc;
			const ids = Array.from( out.querySelectorAll( 'sup' ) ).map( ( sup ) => sup.id );
			assert.deepStrictEqual( ids, [ 'cite_ref-O%27Brien_1-0', 'cite_ref-O%27Brien_1-1' ] );
			const backLink = out.querySelector( 'a.pcs-ref-back-link' );
			const { backLinks } = pagelib.ReferenceCollection.collectReferencesForBackLink(
				out, backLink, backLink.getAttribute( 'href' )
			);
			assert.deepStrictEqual( backLinks.map( ( link ) => link.id ), ids );
			assert.strictEqual( out.querySelector( 'h2' ).id, 'Children\'s_books' );
		} );
	} );
	it( 'detects mwids', () => {
		assert( constants.mwidRegex.test( 'mwlA' ) );
		assert( !constants.mwidRegex.test( 'mwlAlA' ) );
		assert( !constants.mwidRegex.test( 'mw  ' ) );
		assert( constants.mwidRegex.test( 'mwABC' ) );
		assert( constants.mwidRegex.test( 'mw123' ) );
		assert( !constants.mwidRegex.test( ' mw123' ) );
		assert( !constants.mwidRegex.test( 'mw12 ' ) );
	} );
	it( 'detects https', () => {
		assert( constants.httpsRegex.test( 'https://' ) );
		assert( !constants.httpsRegex.test( 'nothttps://' ), 'String needs to begin with https' );
		assert( !constants.httpsRegex.test( 'http://' ) );
	} );
	it( 'detects header tags', () => {
		assert( constants.headerTagRegex.test( 'H1' ) );
		assert( !constants.headerTagRegex.test( 'h1' ), 'Lowercase not supported' );
		assert( constants.headerTagRegex.test( 'H7' ) );
		assert( !constants.headerTagRegex.test( 'H9A' ), 'String must only contain header tag name' );
	} );
	it( 'detects single bracket spans', () => {
		assert( constants.bracketSpanRegex.test( '[' ) );
		assert( constants.bracketSpanRegex.test( ']' ) );
		assert( !constants.bracketSpanRegex.test( ']]' ) );
		assert( !constants.bracketSpanRegex.test( '[]' ) );
		assert( !constants.bracketSpanRegex.test( 'a' ) );
	} );
	it( 'detects infobox classes', () => {
		assert( constants.infoboxClassRegex.test( 'pcs-class infobox' ) );
		assert( constants.infoboxClassRegex.test( 'some-class infobox another-class' ) );
		assert( constants.infoboxClassRegex.test( 'infobox_v3' ) );
	} );
	it( 'detects infobox exclusion classes', () => {
		assert( constants.infoboxClassExclusionRegex.test( 'infobox metadata' ) );
		assert( constants.infoboxClassExclusionRegex.test( 'mbox-small infobox' ) );
		assert( constants.infoboxClassExclusionRegex.test( 'metadata' ) );
	} );
	it( 'detects new class', () => {
		assert( constants.newClassRegex.test( 'infobox new' ) );
		assert( constants.newClassRegex.test( 'new infobox' ) );
		assert( constants.newClassRegex.test( 'new' ) );
	} );
	it( 'detects images to exclude from widening class', () => {
		assert( constants.widenImageExclusionClassRegex.test( 'infobox tsingle' ) );
		assert( constants.widenImageExclusionClassRegex.test( 'noresize infobox' ) );
		assert( constants.widenImageExclusionClassRegex.test( 'noviewer' ) );
	} );
	it( 'detects reference text', () => {
		assert( constants.referenceClassRegex.test( 'infobox mw-reference-text' ) );
		assert( constants.referenceClassRegex.test( 'mw-reference-text infobox' ) );
		assert( constants.referenceClassRegex.test( 'mw-reference-text' ) );
		assert( constants.referenceClassRegex.test( 'reference-text' ) );
		assert( !constants.referenceClassRegex.test( 'someother-reference-text' ) );
		assert( !constants.referenceClassRegex.test( 'mw-linkback-text' ) );
	} );
	it( 'detects forbidden element classes', () => {
		assert( constants.forbiddenElementClassRegex.test( 'infobox geo-nondefault' ) );
		assert( constants.forbiddenElementClassRegex.test( 'geo-multi-punct infobox' ) );
		assert( constants.forbiddenElementClassRegex.test( 'hide-when-compact' ) );
		assert( !constants.forbiddenElementClassRegex.test( 'hides-when-compact' ) );
	} );
	it( 'detects forbidden element class substrings', () => {
		assert( constants.forbiddenElementClassSubstringRegex.test( 'infobox nomobilesok ok' ) );
		assert( constants.forbiddenElementClassSubstringRegex.test( 'navboxer infobox' ) );
		assert( constants.forbiddenElementClassSubstringRegex.test( 'nomobile' ) );
		assert( !constants.forbiddenElementClassSubstringRegex.test( 'infobox' ) );
	} );
	it( 'detects forbidden div classes', () => {
		assert( !constants.forbiddenDivClassRegex.test( 'infobox Z3988 ok' ) );
		assert( !constants.forbiddenDivClassRegex.test( 'Z3988 infobox' ) );
		assert( constants.forbiddenDivClassRegex.test( 'magnify' ) );
		assert( !constants.forbiddenDivClassRegex.test( 'someclass notmagnify' ) );
	} );
	it( 'detects forbidden span classes', () => {
		assert( constants.forbiddenSpanClassRegex.test( 'infobox Z3988 ok' ) );
		assert( constants.forbiddenSpanClassRegex.test( 'Z3988 infobox' ) );
		assert( constants.forbiddenSpanClassRegex.test( 'Z3988' ) );
		assert( !constants.forbiddenSpanClassRegex.test( 'someclass notZ3988' ) );
	} );
	it( 'detects forbidden element ids', () => {
		assert( constants.forbiddenElementIDRegex.test( 'coordinates' ) );
		assert( !constants.forbiddenElementIDRegex.test( 'notcoordinates' ) );
		assert( !constants.forbiddenElementIDRegex.test( 'COORDINATES' ) );
	} );
	it( 'was worth it to write these regexes', () => {
		const doc = fixtures.readIntoDocument( 'United_States.html' );
		const element = doc.getElementById( 'mwFA' );

		let start = perf.start();
		const cls = element.getAttribute( 'class' );
		const trials = 1000;
		for ( let i = 0; i < trials; i++ ) {
			constants.infoboxClassRegex.test( cls );
			constants.infoboxClassExclusionRegex.test( cls );
		}
		const regexNS = perf.finish( start );

		start = perf.start();
		for ( let i = 0; i < trials; i++ ) {
			element.classList.contains( 'infobox' );
			element.classList.contains( 'infoxbox_v3' );
			element.classList.contains( 'metadata' );
			element.classList.contains( 'mbox-small' );
		}
		const containsNS = perf.finish( start );

		assert( regexNS < containsNS, 'Infobox regexes should be faster than classList.contains' );
	} );
	it( 'truncates reference links properly', () => {
		assert.strictEqual( Reference.truncateLinkText( '[notes 1]' ), '[N 1]' );
		assert.strictEqual( Reference.truncateLinkText( '[notes 101]' ), '[N ..1]' );
		assert.strictEqual( Reference.truncateLinkText( '[1029]' ), '[..29]' );
		assert.strictEqual( Reference.truncateLinkText( '[999]' ), '[999]' );
		assert.strictEqual( Reference.truncateLinkText( '[1001]' ), '[..01]' );
		assert.strictEqual( Reference.truncateLinkText( '[10001]' ), '[...01]' );
	} );

	describe( 'handles sub-references', () => {
		const subRefDocument = fixtures.readIntoDocument( path.resolve( PAGELIB_FIXTURES, 'SubReferences.html' ) );

		it( 'formats sub-references', () => MobileHTML.promise( subRefDocument ).then(
			( mobileHTML ) => {
				const mainReflistItem = mobileHTML.doc.getElementById( 'cite_note-main1-1' );
				const mainBacklink = mainReflistItem.querySelector( '.pcs-ref-backlink-container' );
				assert.strictEqual(
					mainBacklink.textContent, '[1]',
					'Main+details main backlink has a number despite being unused'
				);
				assert.strictEqual(
					mainBacklink.querySelector( 'a' ), undefined,
					'Main+details main backlink is not a link'
				);
				assert.strictEqual(
					mainReflistItem.querySelector( '.pcs-ref-body' ).textContent,
					'main plus details (body)',
					'Main plus details footnote body is correct'
				);

				const subrefReflistItem = mobileHTML.doc.getElementById( 'cite_note-2' );
				assert.strictEqual(
					subrefReflistItem.querySelector( '.pcs-ref-body' ).textContent,
					'p. 123',
					'Main+details subref reflist item is correct'
				);
				const subrefBacklink = subrefReflistItem.querySelector( '.pcs-ref-backlink-container' );
				assert.strictEqual(
					subrefBacklink.textContent, '[1.1]',
					'Main+details subref backlink marker is correct'
				);
				assert.strictEqual(
					subrefBacklink.querySelector( 'a' ).href, '/wiki/CiteDetails#pcs-ref-back-link-cite_note-2',
					'Main+details backlink is a link'
				);

				assert.strictEqual(
					mobileHTML.doc.getElementById( 'cite_ref-4' ).textContent,
					'[2.1]',
					'Subref footnote marker has two parts'
				);
				assert.strictEqual(
					mobileHTML.doc.getElementById( 'cite_note-4' ).querySelector( '.pcs-ref-backlink-container' ).textContent,
					'[2.1]',
					'Subref reflist item has a marker-like backref'
				);
				assert.strictEqual(
					mobileHTML.doc.getElementById( 'cite_note-4' ).querySelector( '.pcs-ref-body' ).textContent,
					'Subreference (body)',
					'Subref footnote body is correct'
				);

				assert.strictEqual(
					mobileHTML.doc.getElementById( 'cite_note-:0-3' ).querySelector( '.pcs-ref-backlink-container' ).textContent,
					'[2]',
					'Parent reflist item has a marker-like backref'
				);
				assert.strictEqual(
					mobileHTML.doc.getElementById( 'cite_note-:0-3' ).querySelector( '.pcs-ref-body' ).textContent,
					'Named ref (body)',
					'Parent ref footnote body is correct'
				);
			} )
		);
	} );
} );
