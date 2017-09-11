'use strict';

const domino = require('domino');
const preq   = require('preq');
const assert = require('../../utils/assert.js');
const headers = require('../../utils/headers.js');
const server = require('../../utils/server.js');

describe('read-base-html', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => { return server.start(); });

    const localUri = (title, domain = 'en.wikipedia.org') => {
        return `${server.config.uri}${domain}/v1/page/read-base-html/${title}`;
    };

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', () => {
        const uri = localUri('Foobar');
        return headers.checkHeaders(uri, headers.HTML_CONTENT_TYPE_REGEX);
    });

    it('HTML should be sectioned', () => {
        const uri = localUri('Foobar/788941783');
        return preq.get({ uri })
        .then((res) => {
            const document = domino.createDocument(res.body);
            assert.selectorExistsNTimes(document, 'div.toclevel_1', 7, 'should have 7 sections');
        });
    });
});
