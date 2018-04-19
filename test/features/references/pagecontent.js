'use strict';

const preq   = require('preq');
const assert = require('../../utils/assert.js');
const headers = require('../../utils/headers.js');
const server = require('../../utils/server.js');

describe('references', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => server.start());

    const localUri = (title, domain = 'en.wikipedia.org') => {
        return `${server.config.uri}${domain}/v1/page/references/${title}`;
    };

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', () => {
        const uri = localUri('Foobar');
        return headers.checkHeaders(uri);
    });

    it('should respond with a reference item with back links and content', () => {
        const uri = localUri('User:BSitzmann_%28WMF%29%2FMCS%2FTest%2FFrankenstein/803891963');
        return preq.get({ uri })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.deepEqual(res.body.reference_lists.length, 1,
                    '1 reference_lists items expected');
                assert.deepEqual(res.body.reference_lists[0].section_heading.id, 'Footnotes',
                    'id of section_heading');
                assert.deepEqual(res.body.reference_lists[0].section_heading.html, 'Footnotes',
                    'html of section_heading');
                assert.deepEqual(res.body.reference_lists[0].id, null,
                    'id should be defined (but can be null)');
                assert.deepEqual(res.body.reference_lists[0].order.length, 5,
                    'order should have 5 items');
                const id = res.body.reference_lists[0].order[0];
                assert.ok(res.body.references_by_id[id], 'ref detail object');
                assert.deepEqual(res.body.references_by_id[id].back_links.length, 1,
                    'ref should have at least one back link');
                assert.ok(res.body.references_by_id[id].content,
                    'ref should have content object');
                assert.ok(res.body.references_by_id[id].content.html.length > 0,
                    'ref should have non-empty content.html string');
                assert.equal(res.body.references_by_id[id].content.type, 'generic',
                    'ref should have content.type generic');
                assert.ok(res.body.references_by_id[id].id === undefined,
                    `ref id shouldn't be included again`);
            });
    });
});
