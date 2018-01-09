'use strict';


const assert = require('./assert.js');
const preq   = require('preq');

const PROFILE_REGEX = 'profile="https://www.mediawiki.org/wiki/Specs/[A-Za-z-]+/\\d+\\.\\d+\\.\\d+"$';
const JSON_CONTENT_TYPE_REGEX = `^application/json; charset=utf-8; ${PROFILE_REGEX}`;
const HTML_CONTENT_TYPE_REGEX = `^text/html; charset=utf-8; ${PROFILE_REGEX}`;

function checkHeaders(uri, expContentType) {
    return preq.get({ uri })
        .then((res) => {
            assert.deepEqual(res.status, 200);
            expContentType = expContentType || JSON_CONTENT_TYPE_REGEX;
            assert.contentType(res, expContentType);
            assert.ok(RegExp('^"[^/"]+/[^/"]+"$').test(res.headers.etag),
                'The ETag header is not present or invalid');
            assert.notContains(res.headers.etag, 'undefined',
                'etag should not contain "undefined"');
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
        });
}


module.exports = {
    HTML_CONTENT_TYPE_REGEX,
    checkHeaders
};
