'use strict';

const assert = require('../../utils/assert.js');
const preq   = require('preq');
const server = require('../../utils/server.js');
const headers = require('../../utils/headers.js');

describe('featured-image', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => server.start());

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/media/image/featured/2016/04/15`;
        return headers.checkHeaders(uri, 'application/json');
    });

    it('featured image of 2016/04/15 should have expected properties', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/media/image/featured/2016/04/15`;
        const title = 'File:Iglesia de La Compañía, Quito, Ecuador, 2015-07-22, DD 116-118 HDR.JPG';
        return preq.get({ uri })
            .then((res) => {
                assert.status(res, 200);
                // the page id should be stable but not the revision:
                assert.ok(res.headers.etag.startsWith('"42184395/'));
                assert.equal(res.body.title, title);
                assert.equal(res.body.thumbnail.source, 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Iglesia_de_La_Compa%C3%B1%C3%ADa%2C_Quito%2C_Ecuador%2C_2015-07-22%2C_DD_116-118_HDR.JPG/640px-Iglesia_de_La_Compa%C3%B1%C3%ADa%2C_Quito%2C_Ecuador%2C_2015-07-22%2C_DD_116-118_HDR.JPG');
                assert.equal(res.body.image.source, 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Iglesia_de_La_Compa%C3%B1%C3%ADa%2C_Quito%2C_Ecuador%2C_2015-07-22%2C_DD_116-118_HDR.JPG');
                assert.ok(res.body.description.text.indexOf('Main altar') >= 0);
                assert.equal(res.body.description.lang, 'en');
            });
    });

    it('incomplete date should return 404', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/media/image/featured/2016/04`;
        return preq.get({ uri })
            .then((res) => {
                throw new Error(`Expected an error, but got status: ${res.status}`);
            }, (err) => {
                assert.status(err, 404);
            });
    });

    it('extra uri path parameter after date should return 404', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/media/image/featured/2016/04/15/11`;
        return preq.get({ uri })
            .then((res) => {
                throw new Error(`Expected an error, but got status: ${res.status}`);
            }, (err) => {
                assert.status(err, 404);
            });
    });

    it('should return description from File page', () => {
        const uri = `${server.config.uri}ru.wikipedia.org/v1/media/image/featured/2016/08/27`;
        return preq.get({ uri })
            .then((res) => {
                assert.ok(res.body.description.text.indexOf('Традиционный') >= 0);
                assert.equal(res.body.description.lang, 'ru');
            });
    });

    it('should return english description where unavailable in request language', () => {
        const uri = `${server.config.uri}fr.wikipedia.org/v1/media/image/featured/2016/04/15`;
        return preq.get({ uri })
            .then((res) => {
                assert.ok(res.body.description.text.indexOf('Main altar') >= 0);
                assert.equal(res.body.description.lang, 'en');
            });
    });

    it('featured image of an old date should return 404', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/media/image/featured/1970/12/31`;
        return preq.get({ uri })
            .then((res) => {
                throw new Error(`Expected an error, but got status: ${res.status}`);
            }, (err) => {
                assert.status(err, 404);
                assert.equal(err.body.type, 'not_found');
            });
    });

    it('Should return 204 for date with no featured image when aggregated flag is set', () => {
        const uri = `${server.config.uri}en.wikipedia.org/v1/media/image/featured/2002/09/12`;
        return preq.get({ uri, query: { aggregated: true } })
          .then((res) => {
              assert.status(res, 204);
              assert.deepEqual(!!res.body, false, 'Expected the body to be empty');
          });
    });
});
