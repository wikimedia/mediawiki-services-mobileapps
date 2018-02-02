'use strict';

const topPages = require('../../../private/top-pages/top-pages.en.json').items;

const server = require('../../utils/server.js');
const assert = require('../../utils/assert.js');
const domino = require('domino');
const preq = require('preq');

/* eslint-disable no-console */

// Note: to run large tests set the env variable LARGE_TESTS to any string
describe('references-large', function() {

    const knownSectionHeadings = [ 'References', 'Notes', 'References and notes',
        'Explanatory notes', 'Footnotes', 'Notes and sources', 'Citations'];

    const knownRefIdsWithoutBackLinks = [
        'cite_note-S8renewal-120' // no backlinks in https://en.wikipedia.org/api/rest_v1/page/html/Shameless_(U.S._TV_series)/823068141#cite_note-S8renewal-120
    ];

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => {
        return server.start();
    });

    function uriSuffix(title, rev) {
        return `${encodeURIComponent(title)}/${rev}`;
    }

    function prodParsoid(title, rev, lang = 'en') {
        return `https://${lang}.wikipedia.org/api/rest_v1/page/html/${uriSuffix(title, rev)}`;
    }

    function uriForEndpointName(title, rev, lang = 'en') {
        const baseUri = `${server.config.uri}${lang}.wikipedia.org/v1/page/references`;
        return `${baseUri}/${uriSuffix(title, rev)}`;
    }

    function verifyNonEmptyResults(response, uri) {
        assert.equal(response.status, 200);
        if (response.body.structure.length === 0) {
            console.log('warning: no reflist found');
        }
        for (let i = 0; i < response.body.structure.length; i++) {
            const reflist = response.body.structure[i];
            if (reflist.length === 0) {
                console.log('warning: reflist empty');
            }
        }
    }

    function verifyReference(parsoidRef, refId, details) {
        assert.equal(parsoidRef.id, `cite_note-${refId}`, 'ref id');
        if (!knownRefIdsWithoutBackLinks.includes(parsoidRef.id)) {
            assert.ok(details[refId].back_links, `no back_links in ref ${parsoidRef.id}`);
        }
        if (!details[refId].content) {
            console.log(`warning: empty content in ref ${parsoidRef.id}`);
        }
    }

    function verifyWithOriginalParsoidResponse(referencesResponse, parsoidResponse, title, rev) {
        const document = domino.createDocument(parsoidResponse.body);
        const parsoidRefLists = document.querySelectorAll('ol.mw-references');
        assert.equal(referencesResponse.body.structure.length, parsoidRefLists.length,
            'number of lists');

        // go over all reference lists
        for (let i = 0; i < parsoidRefLists.length; i++) {
            const refList = referencesResponse.body.structure[i];
            const parsoidRefList = parsoidRefLists[i];
            const section = parsoidRefList.closest('section') || undefined;
            const sectionHeadingElement = section && section.querySelector('h1,h2,h3,h4,h5,h5');
            const sectionHeading = sectionHeadingElement && sectionHeadingElement.innerHTML.trim();
            if (sectionHeading) {
                if (!knownSectionHeadings.includes(sectionHeading)) {
                    console.log(`== heading(${title}/${rev}) = ${sectionHeading}`);
                }
            } else {
                console.log(`== heading(${title}/${rev}) = !!Not found!!`);
            }
            assert.equal(refList.type, 'reference_list', 'list type');
            assert.equal(refList.id, parsoidRefList.getAttribute('about'), 'list id');
            const parsoidRefsInList = parsoidRefList.children;
            assert.equal(refList.order.length, parsoidRefsInList.length, 'list length');

            // go over all references in one list
            for (let j = 0; j < parsoidRefsInList.length; j++) {
                const parsoidRef = parsoidRefsInList[j];
                const refId = refList.order[j];
                verifyReference(parsoidRef, refId, referencesResponse.body.references);
            }
        }
    }

    function fetchAndVerify(title, rev) {
        let referencesResponse;
        const uri = uriForEndpointName(title, rev);
        console.log(uri);
        return preq.get(uri)
        .then((response) => {
            referencesResponse = response;
            verifyNonEmptyResults(response, uri);
            console.log(prodParsoid(title, rev));
            return preq.get(prodParsoid(title, rev));
        }).then((parsoidResponse) => {
            return verifyWithOriginalParsoidResponse(referencesResponse, parsoidResponse,
                title, rev);
        });
    }

    function runTest(page) {
        const rev = page.rev.split('/')[0];
        return fetchAndVerify(page.title, rev);
    }

    if (process.env.LARGE_TESTS) {
        for (const page of topPages) {
            it(`references-large: ${page.title}`, () => {
                return runTest(page);
            });
        }
    } else {
        it(`references-large: single page`, () => {
            return runTest({ "title": "List_of_highest-grossing_Indian_films",
                "rev": "822986388" });
        });
    }
});
