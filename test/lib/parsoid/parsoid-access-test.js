'use strict';

const domino = require('domino');
const parsoid = require('../../../lib/parsoid-access');
const assert = require('../../utils/assert');

const headHtml1
    = `<html><head>
        <base href="//en.wikipedia.org/wiki/"/>
        <link rel="dc:isVersionOf" href="//en.wikipedia.org/wiki/Hope_(painting)"/>
    </head></html>`;

const headHtml2
    = `<html>
        <head>
            <base href="//test.wikipedia.org/wiki/"/>
            <link rel="dc:isVersionOf"
                  href="//test.wikipedia.org/wiki/User%3ABSitzmann_(WMF)/MCS/Test/Title_with_%3A"/>
        </head>
        <body>
            <a rel="mw:WikiLink" href="./User:BSitzmann_(WMF)/MCS/Test/Title_with_:#Section_1"
               id="mwDw">#Section 1</a>
        </body>
       </html>`;

describe('lib:parsoid-access', () => {

    it('getBaseUri()', () => {
        const doc = domino.createDocument(headHtml1);
        assert.deepEqual(parsoid.getBaseUri(doc), '//en.wikipedia.org/wiki/');
    });

    it('getParsoidLinkTitle should return DB title', () => {
        const doc = domino.createDocument(headHtml1);
        assert.deepEqual(parsoid.getParsoidLinkTitle(doc), 'Hope_(painting)');
    });

    it('getParsoidLinkTitle should percent-decode title', () => {
        const doc = domino.createDocument(headHtml2);
        assert.deepEqual(parsoid.getParsoidLinkTitle(doc),
            'User:BSitzmann_(WMF)/MCS/Test/Title_with_:');
    });

});

describe('lib:parsoid-access etag handling', () => {

    it('gets strong etag with no quotes', () => {
        const headers = { etag: "123/Foo" };
        assert.deepEqual(parsoid.getEtagFromHeaders(headers), '123/Foo');
    });

    it('strips prefix from weak etags', () => {
        const headers = { etag: 'W/"123/Foo"' };
        assert.deepEqual(parsoid.getEtagFromHeaders(headers), '123/Foo');
    });

    it('gets revision from etag', () => {
        const headers = { etag: "123/Foo" };
        assert.deepEqual(parsoid.getRevisionFromEtag(headers), '123');
    });

    it('gets revision and tid from etag', () => {
        const headers = { etag: "123/Foo" };
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
