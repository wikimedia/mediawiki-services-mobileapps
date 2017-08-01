'use strict';

const preq   = require('preq');
const assert = require('../../utils/assert.js');
const headers = require('../../utils/headers.js');
const server = require('../../utils/server.js');

describe('formatted-lead', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => { return server.start(); });

    const localUri = (title, domain = 'en.wikipedia.org') => {
        return `${server.config.uri}${domain}/v1/page/formatted-lead/${title}`;
    };

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', () => {
        const uri = localUri('Foobar');
        return headers.checkHeaders(uri);
    });

    it('File pages have a file property', () => {
        const title = 'File:Charlie_and_the_Chocolate_Factory_original_cover.jpg';
        const uri = localUri(title);
        return preq.get({ uri })
        .then((res) => {
            assert.deepEqual(res.status, 200);
            assert.ok(res.body.userinfo === undefined, 'userinfo property should be undefined');
            assert.ok(res.body.imageinfo !== undefined, 'imageinfo property should defined');
            assert.ok(res.body.imageinfo.thumburl !== undefined,
                'thumbnail url property is defined');
        });
    });

    it('User pages have a userinfo property', () => {
        const uri = localUri('User:Jdlrobson');
        return preq.get({ uri })
        .then((res) => {
            assert.deepEqual(res.status, 200);
            assert.ok(res.body.imageinfo === undefined, 'imageinfo property should undefined');
            assert.ok(res.body.userinfo !== undefined, 'userinfo property should defined');
            assert.ok(res.body.userinfo.registration !== undefined,
                'userinfo property should have date of registration');
            assert.ok(res.body.userinfo.name === 'Jdlrobson', 'userinfo property should have name');
        });
    });
});
