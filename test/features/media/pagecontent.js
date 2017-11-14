'use strict';

const preq   = require('preq');
const assert = require('../../utils/assert');
const server = require('../../utils/server');
const headers = require('../../utils/headers');

describe('media', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => { return server.start(); });

    function checkItemHasExpectedProperties(item) {
        const urlStart = 'https://upload.wikimedia.org/';
        assert.ok(item.title.indexOf('File:') === 0, 'Expected title to start with "File:"');
        assert.ok(item.url.indexOf(urlStart) === 0, 'Expected url to start with certain text');
    }

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', () => {
        return headers.checkHeaders(`${server.config.uri}en.wikipedia.org/v1/page/media/Foobar`);
    });

    it('Sections/deep page should have no media items', () => {
        const uri = `${server.config.uri}test.wikipedia.org/v1/page/media/Sections%2Fdeep`;
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.deepEqual(res.body.items.length, 0, 'Expected no media items');
            });
    });
    it('en Main page should have at least one image', () => {
        return preq.get({ uri: `${server.config.uri}en.wikipedia.org/v1/page/media/Main_Page` })
            .then((res) => {
                assert.ok(res.body.items.length > 0, 'Expected at least one media item');
            });
    });
    it('en Barack Obama should have many media items', () => {
        return preq.get({ uri: `${server.config.uri}en.wikipedia.org/v1/page/media/Barack_Obama` })
            .then((res) => {
                const items = res.body.items;
                assert.deepEqual(res.status, 200);
                assert.ok(items.length > 3, 'Expected many media items');
                checkItemHasExpectedProperties(items[0]);
            });
    });
    it('Missing title should respond with 404', () => {
        return preq.get({ uri: `${server.config.uri}test.wikipedia.org/v1/page/media/weoiuyrxxn` })
            .then(() => {
                assert.fail("expected an exception to be thrown");
            }).catch((res) => {
                assert.deepEqual(res.status, 404);
            });
    });
});
