'use strict';

const domino = require('domino');
const preq   = require('preq');
const assert = require('../../utils/assert.js');
const server = require('../../utils/server.js');

describe('mobile-html-offline-resources', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => server.start());

    const metawikiApiUri = server.config.conf.services[0].conf.mobile_html_rest_api_base_uri
        .replace(new RegExp('(https|http)://'), '//');

    const localUri = (title, domain = 'en.wikipedia.org') => {
        return `${server.config.uri}${domain}/v1/page/mobile-html-offline-resources/${title}`;
    };

    it('Response should be array with JS and CSS resources', () => {
        const domain = 'en.wikipedia.org';
        const uri = localUri('Foobar/788941783', domain);

        const expected = [
            `${metawikiApiUri}data/css/mobile/base`,
            `${metawikiApiUri}data/css/mobile/pcs`,
            `${metawikiApiUri}data/javascript/mobile/pcs`,
            `//${domain}/api/rest_v1/data/css/mobile/site`,
        ];

        return preq.get({ uri })
        .then((res) => {
            const response = res.body;
            assert.ok(Array.isArray(response));
            assert.deepEqual(response, expected);
        });
    });
});
