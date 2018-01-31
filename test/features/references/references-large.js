'use strict';

const topPages = require('../../../private/top-pages/top-pages.en.json').items;

const server = require('../../utils/server.js');
const assert = require('../../utils/assert.js');
const domino = require('domino');
const preq = require('preq');

// Note: to run large tests set the env variable LARGE_TESTS to any string
describe('references-large', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => {
        return server.start();
    });

    function prodParsoid(title, lang = 'en') {
        return `https://${lang}.wikipedia.org/api/rest_v1/page/html/${title}`;
    }

    function uriForEndpointName(title, lang = 'en') {
        return `${server.config.uri}${lang}.wikipedia.org/v1/page/references/${title}`;
    }

    function verifyNonEmptyResults(response, uri) {
        assert.equal(response.status, 200);
        assert.ok(response.body.structure[0].order.length > 0,
            `${uri} should have fetched some results`);
    }

    function verifyReference(parsoidRef, refId, details) {
        assert.equal(parsoidRef.id, `cite_note-${refId}`, 'ref id');
        assert.ok(details[refId].back_links.length > 0, 'ref no back_links');
        assert.ok(details[refId].content.length > 0, 'ref no content');
    }

    function verifyWithOriginalParsoidResponse(referencesResponse, parsoidResponse, title) {
        const document = domino.createDocument(parsoidResponse.body);
        const parsoidRefLists
            = document.querySelectorAll('ol.mw-references');
        assert.equal(referencesResponse.body.structure.length, parsoidRefLists.length,
            'number of lists');

        // go over all reference lists
        for (let i = 0; i < parsoidRefLists.length; i++) {
            const refList = referencesResponse.body.structure[i];
            const parsoidRefList = parsoidRefLists[i];
            if (parsoidRefList.parentNode.previousElementSibling) {
                // eslint-disable-next-line
                console.log(`title = ${parsoidRefList.parentNode.previousElementSibling.textContent}`);
            } else {
                // eslint-disable-next-line no-console
                console.log(`title = <unknown>`);
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

    function fetchAndVerify(title) {
        let referencesResponse;
        const uri = uriForEndpointName(title);
        return preq.get(uri)
        .then((response) => {
            referencesResponse = response;
            verifyNonEmptyResults(response, uri);
            return preq.get(prodParsoid(title));
        }).then((parsoidResponse) => {
            verifyWithOriginalParsoidResponse(referencesResponse, parsoidResponse, title);
        });
    }

    if (process.env.LARGE_TESTS) {
        for (const page of topPages) {
            it(`references-large: ${page.title}`, () => {
                return fetchAndVerify(page.title);
            });
        }
    }
});
