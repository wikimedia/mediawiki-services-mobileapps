'use strict';

const domino = require('domino');
const assert = require('../../utils/assert');
const testUtil = require('../../utils/testUtil');
const lib = require('../../../lib/domUtil');

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

describe('lib:domUtil', () => {

    describe('isRTL', () => {
        it('isRTL should return false for LTR doc', () => {
            const document = testUtil.readTestFixtureDoc('Dog.html');
            const firstSectionElement = document.querySelector('section');
            assert.ok(!lib.isRTL(firstSectionElement));
        });

        it('isRTL should return true for RTL doc', () => {
            const document = testUtil.readTestFixtureDoc('ar-Mathematics.html');
            const firstSectionElement = document.querySelector('section');
            assert.ok(lib.isRTL(firstSectionElement));
        });
    });

    describe('getBaseUri()', () => {
        it('returns URL without protocol', () => {
            const doc = domino.createDocument(headHtml1);
            assert.deepEqual(lib.getBaseUri(doc), '//en.wikipedia.org/wiki/');
        });
    });

    describe('getHttpsBaseUri()', () => {
        it('returns URL with https protocol', () => {
            const doc = domino.createDocument(headHtml1);
            assert.deepEqual(lib.getHttpsBaseUri(doc), 'https://en.wikipedia.org/wiki/');
        });
    });

    describe('getParsoidLinkTitle', () => {
        it('getParsoidLinkTitle should return DB title', () => {
            const doc = domino.createDocument(headHtml1);
            assert.deepEqual(lib.getParsoidLinkTitle(doc), 'Hope_(painting)');
        });

        it('getParsoidLinkTitle should percent-decode title', () => {
            const doc = domino.createDocument(headHtml2);
            assert.deepEqual(lib.getParsoidLinkTitle(doc),
                'User:BSitzmann_(WMF)/MCS/Test/Title_with_:');
        });
    });
});
