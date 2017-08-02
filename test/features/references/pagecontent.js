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

    it('should respond with a reference item with back links and content', () => {
        const uri = localUri('User:BSitzmann_%28WMF%29%2FMCS%2FTest%2FFrankenstein');
        return preq.get({ uri })
            .then((res) => {
                assert.equal(res.status, 200);
                assert.equal(res.body.structure.length, 1, '1 structure expected');
                assert.ok(res.body.structure[0].id !== undefined, 'id should be defined');
                assert.equal(res.body.structure[0].type, 'reference_list',
                    'type should be "reference_list"');
                assert.ok(res.body.structure[0].order.length > 0,
                    'order should have items');
                const id = res.body.structure[0].order[0];
                assert.ok(res.body.references[id], 'there should be some references');
                assert.ok(res.body.references[id].back_links.length > 0,
                    'ref should have at least one back link');
                assert.ok(res.body.references[id].content.length > 0,
                    'ref should have content string');
                assert.ok(res.body.references[id].id === undefined, `ref id shouldn't be repeated`);
            });
    });
});
