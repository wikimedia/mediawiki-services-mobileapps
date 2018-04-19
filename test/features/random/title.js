'use strict';

const preq   = require('preq');
const assert = require('../../utils/assert');
const server = require('../../utils/server');
const headers = require('../../utils/headers');
const random = require('../../../lib/feed/random');
const sample =  require('./sample-results');

describe('random/title', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => server.start());

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', () => {
        return headers.checkHeaders(`${server.config.uri}en.wikipedia.org/v1/page/random/title`,
            'application/json');
    });

    it('Random page title should have expected properties', () => {
        return preq.get({ uri: `${server.config.uri}de.wikipedia.org/v1/page/random/title` })
            .then((res) => {
                assert.deepEqual(res.status, 200);
                assert.ok(res.body.items[0].title.length > 0, 'title should not be empty');
            });
    });

    it('pickBestResult should select best-scored title from sample', () => {
        const best = random.pickBestResult(sample);
        assert.ok(best.title === 'William Ellis (Medal of Honor)');
    });
});
