'use strict';

const assert = require('../../utils/assert.js');
const domino = require('domino');
const parsoid = require('../../../lib/parsoid-access');

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

describe('lib:parsoid-access', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    it('getBaseUri()', () => {
        const doc = domino.createDocument(headHtml1);
        assert.equal(parsoid._getBaseUri(doc), '//en.wikipedia.org/wiki/');
    });

    it('getParsoidLinkTitle should return DB title', () => {
        const doc = domino.createDocument(headHtml1);
        assert.equal(parsoid._getParsoidLinkTitle(doc), 'Hope_(painting)');
    });

    it('getParsoidLinkTitle should percent-decode title', () => {
        const doc = domino.createDocument(headHtml2);
        assert.equal(parsoid._getParsoidLinkTitle(doc),
            'User:BSitzmann_(WMF)/MCS/Test/Title_with_:');
    });
});
