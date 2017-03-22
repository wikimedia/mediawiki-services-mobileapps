'use strict';

const onThisDayLangs = require('../../../lib/feed/on-this-day.languages.js');

const server = require('../../utils/server.js');
const assert = require('../../utils/assert.js');
const dateUtil = require('../../../lib/dateUtil.js');
const preq = require('preq');

const languages = onThisDayLangs.languages;
const eventTypes = [
    'selected',
    'births',
    'deaths',
    'events',
    'holidays'
];

// Note: to run large tests set the env variable LARGE_TESTS to any string
describe('onthisday-large', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => {
        return server.start();
    });

    function uriForEndpointName(monthSlashDay, endpointName, lang = 'en') {
        const baseUri = `${server.config.uri}${lang}.wikipedia.org/v1/feed/onthisday/`;
        return `${baseUri}${endpointName}/${monthSlashDay}`;
    }

    function verifyNonEmptyResults(response, endpointName, uri) {
        assert.equal(response.status, 200);
        assert.ok(response.body[endpointName].length > 0,
            `${uri} should have fetched some results`);
    }

    function fetchAndVerifyNonEmptyResults(monthSlashDay, endpointName, lang) {
        const uri = uriForEndpointName(monthSlashDay, endpointName, lang);
        return preq.get(uri)
                   .then((response) => {
                       verifyNonEmptyResults(response, endpointName, uri);
                   });
    }

    if (process.env.LARGE_TESTS) {
        for (const lang in languages) {
            if (Object.prototype.hasOwnProperty.call(languages, lang)) {
                for (const type of eventTypes) {
                    for (const date = new Date(Date.UTC(2016, 0, 1)); // use a leap year
                         date < new Date(Date.UTC(2017, 0, 1));
                         date.setUTCDate(date.getUTCDate() + 1)) {

                        const month = dateUtil.pad(date.getUTCMonth() + 1);
                        const day = dateUtil.pad(date.getUTCDate());
                        const monthSlashDay = `${month}/${day}`;
                        it(`${lang}-${type}: ${monthSlashDay}`, () => {
                            return fetchAndVerifyNonEmptyResults(monthSlashDay, type, lang);
                        });
                    }
                }
            }
        }
    }
});
