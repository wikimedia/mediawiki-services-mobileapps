'use strict';

const assert = require('../../utils/assert.js');
const preq   = require('preq');
const server = require('../../utils/server.js');
const headers = require('../../utils/headers.js');

describe('featured-image', function() {
    this.timeout(20000);

    before(() => { return server.start(); });

    it('featured image of a specific date should respond to GET request with expected headers, incl. CORS and CSP headers', () => {
        return headers.checkHeaders(`${server.config.uri}en.wikipedia.org/v1/media/image/featured/2016/04/15`,
            'application/json');
    });

    it('featured image of 2016/04/15 should have expected properties', () => {
        return preq.get({ uri: `${server.config.uri}en.wikipedia.org/v1/media/image/featured/2016/04/15` })
            .then((res) => {
                assert.status(res, 200);
                // the page id should be stable but not the revision:
                assert.ok(res.headers.etag.indexOf('42184395/') == 0);
                assert.equal(res.body.title, 'File:Iglesia de La Compañía, Quito, Ecuador, 2015-07-22, DD 116-118 HDR.JPG');
                assert.equal(res.body.thumbnail.source, 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Iglesia_de_La_Compa%C3%B1%C3%ADa%2C_Quito%2C_Ecuador%2C_2015-07-22%2C_DD_116-118_HDR.JPG/640px-Iglesia_de_La_Compa%C3%B1%C3%ADa%2C_Quito%2C_Ecuador%2C_2015-07-22%2C_DD_116-118_HDR.JPG');
                assert.equal(res.body.image.source, 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Iglesia_de_La_Compa%C3%B1%C3%ADa%2C_Quito%2C_Ecuador%2C_2015-07-22%2C_DD_116-118_HDR.JPG');
                assert.ok(res.body.description.text.indexOf('Main altar') >= 0);
                assert.equal(res.body.description.lang, 'en');
            });
    });

    it('featured image of 2016/05/06 (no extmetadata) should load successfully and have expected properties', () => {
        return preq.get({ uri: `${server.config.uri}en.wikipedia.org/v1/media/image/featured/2016/05/06` })
            .then((res) => {
                assert.status(res, 200);
                assert.equal(res.body.title, 'File:Kazakhstan Altay 3.jpg');
                assert.equal(res.body.thumbnail.source, 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Kazakhstan_Altay_3.jpg/640px-Kazakhstan_Altay_3.jpg');
                assert.equal(res.body.image.source, 'https://upload.wikimedia.org/wikipedia/commons/9/99/Kazakhstan_Altay_3.jpg');
                assert.contains(res.body.description.text, 'Altay mountains');
                assert.equal(res.body.description.lang, 'en');
            });
    });

    it('incomplete date should return 404', () => {
        return preq.get({ uri: `${server.config.uri}en.wikipedia.org/v1/media/image/featured/2016/04` })
            .then((res) => {
                throw new Error(`Expected an error, but got status: ${res.status}`);
            }, (err) => {
                assert.status(err, 404);
            });
    });

    it('extra uri path parameter after date should return 404', () => {
        return preq.get({ uri: `${server.config.uri}en.wikipedia.org/v1/media/image/featured/2016/04/15/11` })
            .then((res) => {
                throw new Error(`Expected an error, but got status: ${res.status}`);
            }, (err) => {
                assert.status(err, 404);
            });
    });

    it('should return description from File page', () => {
        return preq.get({ uri: `${server.config.uri}ru.wikipedia.org/v1/media/image/featured/2016/08/27` })
            .then((res) => {
                assert.ok(res.body.description.text.indexOf('Традиционный') >= 0);
                assert.equal(res.body.description.lang, 'ru');
            });
    });

    it('should return english description where unavailable in request language', () => {
        return preq.get({ uri: `${server.config.uri}fr.wikipedia.org/v1/media/image/featured/2016/04/15` })
            .then((res) => {
                assert.ok(res.body.description.text.indexOf('Main altar') >= 0);
                assert.equal(res.body.description.lang, 'en');
            });
    });

    it('featured image of an old date should return 404', () => {
        return preq.get({ uri: `${server.config.uri}en.wikipedia.org/v1/media/image/featured/1970/12/31` })
            .then((res) => {
                throw new Error(`Expected an error, but got status: ${res.status}`);
            }, (err) => {
                assert.status(err, 404);
                assert.equal(err.body.type, 'not_found');
            });
    });

    it('Should return 204 for date with no featured image when aggregated flag is set', () => {
        return preq.get({ uri: `${server.config.uri}en.wikipedia.org/v1/media/image/featured/2002/09/12`,
            query: { aggregated: true } })
          .then((res) => {
            assert.status(res, 204);
            assert.deepEqual(!!res.body, false, 'Expected the body to be empty');
        });
    });
});
