'use strict';

const preq   = require('preq');
const assert = require('../../utils/assert.js');
const server = require('../../utils/server.js');
const headers = require('../../utils/headers.js');

describe('announcements', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => { return server.start(); });

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', () => {
        return headers.checkHeaders(`${server.config.uri}en.wikipedia.org/v1/feed/announcements`);
    });

    it('should return a valid response', () => {
        return preq.get({ uri: `${server.config.uri}en.wikipedia.org/v1/feed/announcements` })
            .then((res) => {
                assert.status(res, 200);
                assert.equal(res.headers['cache-control'], 'public, max-age=7200, s-maxage=14400');
                res.body.announce.forEach((elem) => {
                    assert.ok(elem.id, 'id should be present');
                    assert.ok(elem.type, 'type should be present');
                    assert.ok(elem.start_time, 'start_time should be present');
                    assert.ok(elem.end_time, 'end_time should be present');
                    assert.ok(elem.text, 'text should be present');
                    assert.ok(elem.action.title, 'action text should be present');
                    assert.ok(elem.action.url, 'action url should be present');
                    assert.ok(elem.caption_HTML, 'caption_HTML should be present');
                    assert.ok(elem.countries, 'countries should be present');
                });
            });
    });

    it('should return empty object for other wikis', () => {
        return preq.get({ uri: `${server.config.uri}de.wikipedia.org/v1/feed/announcements` })
            .then((res) => {
                assert.ok(res.body.announce.length === 0);
            });
    });
});
