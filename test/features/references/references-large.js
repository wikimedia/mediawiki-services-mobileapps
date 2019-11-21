'use strict';

const topPages = require('../../../private/page-lists/top-pages/wikipedia/top-pages.en.json').items;

const server = require('../../utils/server');
const assert = require('../../utils/assert');
const mUtil = require('../../../lib/mobile-util');
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

    this.timeout(20000);

    before(() => {
        return server.start();
    });

    function uriSuffix(title) {
        return `${encodeURIComponent(title)}`;
    }

    function prodParsoid(title, lang = 'en') {
        return {
            uri: `https://${lang}.wikipedia.org/api/rest_v1/page/html/${uriSuffix(title)}`,
            headers: {
                accept: mUtil.getContentTypeString(mUtil.CONTENT_TYPES.html),
            }
        };
    }

    function uriForEndpointName(title, lang = 'en') {
        const baseUri = `${server.config.uri}${lang}.wikipedia.org/v1/page/references`;
        return `${baseUri}/${uriSuffix(title)}`;
    }

    function verifyNonEmptyResults(response, uri) {
        assert.deepEqual(response.status, 200);
        if (response.body.reference_lists.length === 0) {
            console.log('warning: no reflist found');
        }
        for (let i = 0; i < response.body.reference_lists.length; i++) {
            const reflist = response.body.reference_lists[i];
            if (reflist.length === 0) {
                console.log('warning: reflist empty');
            }
        }
    }

    function verifyReference(parsoidRef, refId, details) {
        assert.deepEqual(parsoidRef.id, refId, 'ref id');
        if (!knownRefIdsWithoutBackLinks.includes(parsoidRef.id)) {
            assert.ok(details[refId].back_links, `no back_links in ref ${parsoidRef.id}`);
        }
        assert.ok(details[refId].content !== undefined, `no content object in ${refId}`);
        assert.ok(details[refId].content.html !== undefined, `no content.html in ${refId}`);
        if (details[refId].content.html.length === 0) {
            console.log(`warning: empty content.html in ref ${parsoidRef.id}`);
        }
        assert.ok(details[refId].content.type !== undefined, `no content.type in ${refId}`);
    }

    function verifyWithOriginalParsoidResponse(referencesResponse, parsoidResponse, title) {
        const document = domino.createDocument(parsoidResponse.body);
        const parsoidRefLists = document.querySelectorAll('ol.mw-references');
        assert.ok(referencesResponse.body.reference_lists.length === parsoidRefLists.length
            || referencesResponse.body.reference_lists.length === parsoidRefLists.length - 1
        , 'number of lists');

        // go over all reference lists
        for (let i = 0; i < referencesResponse.body.reference_lists.length; i++) {
            const refList = referencesResponse.body.reference_lists[i];
            const parsoidRefList = parsoidRefLists[i];
            const section = parsoidRefList.closest('section') || undefined;
            const sectionHeadingElement = section && section.querySelector('h1,h2,h3,h4,h5,h5');
            const sectionHeading = sectionHeadingElement && sectionHeadingElement.innerHTML.trim();
            if (sectionHeading) {
                if (!knownSectionHeadings.includes(sectionHeading)) {
                    console.log(`== heading(${title}) = ${sectionHeading}`);
                }
            } else {
                console.log(`== heading(${title}) = !!Not found!!`);
            }
            const parsoidListId = parsoidRefList.closest('[about]').getAttribute('about');
            assert.deepEqual(refList.id, parsoidListId, 'list id');
            const parsoidRefsInList = parsoidRefList.children;
            assert.deepEqual(refList.order.length, parsoidRefsInList.length, 'list length');

            // go over all references in one list
            for (let j = 0; j < parsoidRefsInList.length; j++) {
                const parsoidRef = parsoidRefsInList[j];
                const refId = refList.order[j];
                verifyReference(parsoidRef, refId, referencesResponse.body.references_by_id);
            }
        }
    }

    function fetchAndVerify(title) {
        let referencesResponse;
        const uri = uriForEndpointName(title);
        console.log(uri);
        return preq.get({
            uri,
            headers: {
                accept: mUtil.getContentTypeString(mUtil.CONTENT_TYPES.references)
            }
        }).then((response) => {
            referencesResponse = response;
            verifyNonEmptyResults(response, uri);
            console.log(prodParsoid(title));
            return preq.get(prodParsoid(title));
        }).then((parsoidResponse) => {
            return verifyWithOriginalParsoidResponse(referencesResponse, parsoidResponse,
                title);
        });
    }

    function runTest(page) {
        return fetchAndVerify(page.title);
    }

    if (process.env.LARGE_TESTS) {
        for (const page of topPages) {
            it(`references-large: ${page.title}`, () => {
                return runTest(page);
            });
        }
    } else {
        it('references-large: single page', () => {
            return runTest({ title: 'List_of_highest-grossing_Indian_films' });
        });
    }
});
