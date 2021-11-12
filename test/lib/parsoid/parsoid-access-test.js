'use strict';

const domino = require('domino');
const parsoid = require('../../../lib/parsoid-access');
const assert = require('../../utils/assert');

describe('lib:parsoid-access etag handling', () => {

	describe('correctly parses and handles etags', () => {

		it('gets strong etag with no quotes', () => {
			const headers = { etag: '123/Foo' };
			assert.deepEqual(parsoid.getEtagFromHeaders(headers), '123/Foo');
		});

		it('strips prefix from weak etags', () => {
			const headers = { etag: 'W/"123/Foo"' };
			assert.deepEqual(parsoid.getEtagFromHeaders(headers), '123/Foo');
		});

		it('gets revision from etag', () => {
			const headers = { etag: '123/Foo' };
			assert.deepEqual(parsoid.getRevisionFromEtag(headers), '123');
		});

		it('gets revision and tid from etag', () => {
			const headers = { etag: '123/Foo' };
			const revTid = parsoid.getRevAndTidFromEtag(headers);
			assert.deepEqual(revTid.revision, '123');
			assert.deepEqual(revTid.tid, 'Foo');
		});

		it('getEtagFromHeaders handles undefined input', () => {
			assert.deepEqual(parsoid.getEtagFromHeaders(), undefined);
			assert.deepEqual(parsoid.getEtagFromHeaders({}), undefined);
		});

		it('getRevisionFromEtag handles undefined input', () => {
			assert.deepEqual(parsoid.getRevisionFromEtag(), undefined);
			assert.deepEqual(parsoid.getRevisionFromEtag({}), undefined);
		});

		it('getRevAndTidFromEtag handles undefined input', () => {
			assert.deepEqual(parsoid.getRevAndTidFromEtag(), undefined);
			assert.deepEqual(parsoid.getRevAndTidFromEtag({}), undefined);
		});

	});

	describe('parses modified timestamp', () => {

		const html = `<html><head>
            <meta charset="utf-8"/>
            <meta property="dc:modified" content="2015-10-05T21:35:32.000Z"/>
            <meta property="mw:pageNamespace" content="0"/>
        </head><body>Foo</body></html>`;

		const expected = '2015-10-05T21:35:32Z';

		it('parses timestamp from domino Document', () => {
			assert.deepEqual(parsoid.getModified(domino.createDocument(html)), expected);
		});

		it('parses timestamp from HTML string', () => {
			assert.deepEqual(parsoid.getModifiedFromHtml(html), expected);
		});

	});

});
