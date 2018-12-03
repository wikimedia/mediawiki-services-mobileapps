'use strict';

const preq = require('preq');
const assert = require('../../utils/assert.js');
const server = require('../../utils/server.js');
const testUtil = require('../../utils/testUtil.js');
const dateUtil = require('../../../lib/dateUtil');

const languages = ['en'];

// Note: to run large tests set the env variable LARGE_TESTS to any string
describe('featured-image-large', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => {
        return server.start();
    });

    function uriForLang(dateString, lang = 'en') {
        const baseUri = `${server.config.uri}${lang}.wikipedia.org/v1/media/image/featured`;
        return `${baseUri}/${dateString}`;
    }

    function verify(res, lang, uri) {
        assert.ok(res.status === 200);
        assert.ok(res.body.title.length, `${uri} has no title`);
        assert.ok(res.body.description, `${uri} has no description`);
        assert.ok(res.body.description.text.length, `${uri} has no description text`);
        assert.ok(res.body.description.lang.length, `${uri} has no description lang`);
        assert.ok(res.body.thumbnail, `${uri} returns no thumbnail info`);
        assert.ok(res.body.thumbnail.source.length, `${uri} has no thumbnail source URI`);
        assert.ok(!isNaN(res.body.thumbnail.width), `${uri} thumbnail has invalid width`);
        assert.ok(!isNaN(res.body.thumbnail.height), `${uri} thumbnail has invalid width`);
        assert.ok(res.body.image, `${uri} returns no original image info`);
        assert.ok(res.body.image.source.length, `${uri} has no original source URI`);
        assert.ok(!isNaN(res.body.image.width), `${uri} original has invalid width`);
        assert.ok(!isNaN(res.body.image.height), `${uri} original has invalid width`);
    }

    function fetchAndVerify(lang, dateString) {
        const uri = uriForLang(dateString, lang);
        return preq.get(uri).then(res => verify(res, lang, uri));
    }

    if (process.env.LARGE_TESTS) {
        for (const lang of languages) {
            for (const date = new Date(Date.UTC(2016, 0, 1));
                date < dateUtil.addDays(new Date(), 30);
                date.setUTCDate(date.getUTCDate() + 1)) {

                const dateString = testUtil.constructTestDate(date);
                it(`${lang}: ${dateString}`, () => {
                    return fetchAndVerify(lang, dateString);
                });
            }
        }
    }
});
