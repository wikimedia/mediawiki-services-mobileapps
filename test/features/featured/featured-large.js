'use strict';

const assert = require('../../utils/assert.js');
const server = require('../../utils/server.js');
const testUtil = require('../../utils/testUtil.js');
const preq = require('preq');
const languages = require('../../../lib/feed/featured.js').testing.supportedLangs;

// Note: to run large tests set the env variable LARGE_TESTS to any string
describe('featured-large', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => {
        return server.start();
    });

    function uriForLang(dateString, lang = 'en') {
        const baseUri = `${server.config.uri}${lang}.wikipedia.org/v1/page/featured`;
        return `${baseUri}/${dateString}`;
    }

    function verifyNonErrorResults(response, lang, dateString, uri) {
        assert.ok(response.status === 200 || response.status === 204);
        if (response.status === 200) {
            assert.ok(response.body.$merge.length > 0, `${uri} should have fetched some results`);
            // console.log(`${lang} ${dateString}: ${decodeURI(
            //     response.body.$merge[0].replace(/^http.+?summary\//, ''))}\n`);
        }
    }

    function fetchAndVerifyNonErrorResults(lang, dateString) {
        const uri = uriForLang(dateString, lang);
        return preq.get(uri)
                   .then((response) => {
                       verifyNonErrorResults(response, lang, dateString, uri);
                   });
    }

    if (process.env.LARGE_TESTS) {
        for (const lang of languages) {
            for (const date = new Date(Date.UTC(2016, 0, 1));
                date < new Date();
                date.setUTCDate(date.getUTCDate() + 1)) {

                const dateString = testUtil.constructTestDate(date);
                it(`${lang}: ${dateString}`, () => {
                    return fetchAndVerifyNonErrorResults(lang, dateString);
                });
            }
        }
    }
});
