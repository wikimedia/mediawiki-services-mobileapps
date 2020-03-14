'use strict';

const preq   = require('preq');
const assert = require('../../utils/assert.js');
const server = require('../../utils/server.js');

if (!server.stopHookAdded) {
    server.stopHookAdded = true;
    after(() => server.stop());
}

describe('express app', function() {

    this.timeout(20000);

    before(() => server.start());

    it('should get robots.txt', () => {
        return preq.get({
            uri: `${server.config.uri}robots.txt`
        }).then((res) => {
            assert.deepEqual(res.status, 200);
            assert.deepEqual(res.body, 'User-agent: *\nDisallow: /\n');
        });
    });

    it('should set CORS headers', () => {
        if (server.config.service.conf.cors === false) {
            return true;
        }
        return preq.get({
            uri: `${server.config.uri}robots.txt`
        }).then((res) => {
            assert.deepEqual(res.status, 200);
            assert.deepEqual(res.headers['access-control-allow-origin'], '*');
            assert.deepEqual(!!res.headers['access-control-allow-headers'], true);
            assert.deepEqual(!!res.headers['access-control-expose-headers'], true);
        });
    });

    it('should set CSP headers', () => {
        if (server.config.service.conf.csp === false) {
            return true;
        }
        return preq.get({
            uri: `${server.config.uri}robots.txt`
        }).then((res) => {
            assert.deepEqual(res.status, 200);
            assert.deepEqual(res.headers['x-xss-protection'], '1; mode=block');
            assert.deepEqual(res.headers['x-content-type-options'], 'nosniff');
            assert.deepEqual(res.headers['x-frame-options'], 'SAMEORIGIN');
            assert.deepEqual(res.headers['content-security-policy'], "default-src 'none'");
            assert.deepEqual(res.headers['x-content-security-policy'], "default-src 'none'");
            assert.deepEqual(res.headers['x-webkit-csp'], "default-src 'none'");
        });
    });

    it('should get static content gzipped', () => {
        return preq.get({
            uri: `${server.config.uri}static/index.html`,
            headers: {
                'accept-encoding': 'gzip, deflate'
            }
        }).then((res) => {
            assert.deepEqual(res.status, 200);
            // if there is no content-length, the reponse was gzipped
            assert.deepEqual(res.headers['content-length'], undefined,
                'Did not expect the content-length header!');
        });
    });

    it('should get static content uncompressed', () => {
        return preq.get({
            uri: `${server.config.uri}static/index.html`,
            headers: {
                'accept-encoding': ''
            }
        }).then((res) => {
            const contentEncoding = res.headers['content-encoding'];
            assert.deepEqual(res.status, 200);
            assert.deepEqual(contentEncoding, undefined, 'Did not expect gzipped contents!');
        });
    });

    it('should not follow redirects', () => {
        // The following page has a redirect but we don't want MCS to follow it
        // since RESTBase already takes care of redirects.
        const title = 'User:BSitzmann_%28WMF%29%2FMCS%2FTest%2Fredirect_test2';
        const normalizedTitle = 'User:BSitzmann (WMF)/MCS/Test/redirect test2';
        return preq.get(`${server.config.uri}test.wikipedia.org/v1/page/mobile-sections/${title}`)
        .then((res) => {
            assert.equal(res.status, 200);
            assert.equal(res.body.lead.normalizedtitle, normalizedTitle);
            assert.equal(res.body.lead.displaytitle, normalizedTitle);
            assert.ok(res.body.lead.redirect === true);
        });
    });

});
