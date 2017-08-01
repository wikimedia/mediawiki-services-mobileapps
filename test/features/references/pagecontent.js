'use strict';

const preq   = require('preq');
const assert = require('../../utils/assert.js');
const headers = require('../../utils/headers.js');
const server = require('../../utils/server.js');

describe('references', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => { return server.start(); });

    const localUri = (title, domain = 'en.wikipedia.org') => {
        return `${server.config.uri}${domain}/v1/page/references/${title}`;
    };

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', () => {
        const uri = localUri('Foobar');
        return headers.checkHeaders(uri);
    });

    it('Requesting just references returns only sections with references', () => {
        const uri = localUri('Barack_Obama/793008506');
        return preq.get({ uri })
            .then((res) => {
                assert.equal(res.status, 200);
                assert.equal(res.body.sections.length, 4, 'Barack Obama has 4 reference sections');
            });
    });
});
