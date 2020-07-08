'use strict';

const preq   = require('preq');
const assert = require('../../utils/assert.js');
const server = require('../../utils/server.js');

describe('mobile-html-offline-resources', function() {

    this.timeout(20000);

    before(() => server.start());

    const metawikiApiUri = server.config.conf.services[0].conf.mobile_html_rest_api_base_uri
        .replace('{{host}}', 'localhost:8888')
        .replace(new RegExp('(https|http)://'), '//');

    const domain = 'en.wikipedia.org';

    const localApiUri = server.config.conf.services[0]
        .conf.mobile_html_local_rest_api_base_uri_template
        .replace('{{host}}', 'localhost:8888')
        .replace('{{domain}}', domain);

    const localUri = (title, domain = 'en.wikipedia.org') => {
        return `${server.config.uri}${domain}/v1/page/mobile-html-offline-resources/${title}`;
    };

    it('Response should be array with JS and CSS resources', () => {
        const uri = localUri('Foobar/788941783', domain);

        const expected = [
            `${metawikiApiUri}data/css/mobile/base`,
            `${metawikiApiUri}data/css/mobile/pcs`,
            `${metawikiApiUri}data/javascript/mobile/pcs`,
            `//${domain}/api/rest_v1/data/css/mobile/site`,
            `${localApiUri}data/i18n/pcs`
        ];

        return preq.get({ uri })
        .then((res) => {
            const response = res.body;
            const headers = res.headers;
            assert.ok(Array.isArray(response));
            assert.deepEqual(response, expected);
            assert.ok('cache-control' in headers);
            assert.deepEqual(headers['cache-control'], 's-maxage=1209600, max-age=86400');
        });
    });
});
