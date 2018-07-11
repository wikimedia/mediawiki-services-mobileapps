'use strict';


const assert = require('./assert.js');
const preq   = require('preq');

const PROFILE_REGEX = 'profile="https://www.mediawiki.org/wiki/Specs/[A-Za-z-]+/\\d+\\.\\d+\\.\\d+"$';
const JSON_CONTENT_TYPE_REGEX = `^application/json; charset=utf-8; ${PROFILE_REGEX}`;
const HTML_CONTENT_TYPE_REGEX = `^text/html; charset=utf-8; ${PROFILE_REGEX}`;
const CSS_CONTENT_TYPE_REGEX = `^text/css; charset=utf-8; ${PROFILE_REGEX}`;
const JS_CONTENT_TYPE_REGEX = `^text/javascript; charset=utf-8; ${PROFILE_REGEX}`;

/**
 * Check response headers for a request
 * @param {*} uri request URI
 * @param {*} expContentType expected content type spec from mobile-util.js
 * @param {*} additionalHeaders additional headers that should be present
 */
function checkHeaders(uri, expContentType, ...additionalHeaders) {
    return preq.get({ uri })
        .then((res) => {
            assert.deepEqual(res.status, 200);

            expContentType = expContentType || JSON_CONTENT_TYPE_REGEX;
            assert.contentType(res, expContentType);

            assert.ok(RegExp('^"[^/"]+/[^/"]+"$').test(res.headers.etag),
                'The ETag header is not present or invalid');
            assert.notContains(res.headers.etag, 'undefined',
                'etag should not contain "undefined"');

            assert.ok(
                (
                    res.headers.vary === undefined ||
                    !res.headers.vary.toLowerCase().includes('undefined')
                ),
                'Vary should either not exist or not contain "undefined"');

            assert.ok(
                (
                    res.headers['content-language'] === undefined ||
                    !res.headers['content-language'].toLowerCase().includes('undefined')
                ),
                'Content-Language should either not exist or not contain "undefined"');

            assert.deepEqual(res.headers['access-control-allow-origin'], '*');

            assert.deepEqual(res.headers['access-control-allow-headers'],
                'accept, x-requested-with, content-type');

            assert.deepEqual(res.headers['content-security-policy'],
                // eslint-disable-next-line max-len
                "default-src 'self'; object-src 'none'; media-src *; img-src *; style-src *; frame-ancestors 'self'");
            assert.deepEqual(res.headers['x-content-security-policy'],
                // eslint-disable-next-line max-len
                "default-src 'self'; object-src 'none'; media-src *; img-src *; style-src *; frame-ancestors 'self'");

            assert.deepEqual(res.headers['x-frame-options'], 'SAMEORIGIN');
            // eslint-disable-next-line max-len

            additionalHeaders.forEach(
                header => assert.ok(res.headers[header], `Expected ${header} header to be present`)
            );
        });
}


module.exports = {
    HTML_CONTENT_TYPE_REGEX,
    CSS_CONTENT_TYPE_REGEX,
    JS_CONTENT_TYPE_REGEX,
    checkHeaders
};
