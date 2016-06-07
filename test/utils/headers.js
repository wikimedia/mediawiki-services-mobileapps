'use strict';


var assert = require('./assert.js');
var preq   = require('preq');



function checkHeaders(uri, expContentType) {
    return preq.get({ uri: uri })
        .then(function(res) {
            assert.deepEqual(res.status, 200);
            assert.contentType(res, expContentType);
            assert.deepEqual(!!res.headers.etag, true, 'No ETag header present');
            assert.deepEqual(res.headers.etag.indexOf('undefined'), -1, 'etag should not contain "undefined"');
            assert.deepEqual(res.headers['access-control-allow-origin'], '*');
            assert.deepEqual(res.headers['access-control-allow-headers'], 'accept, x-requested-with, content-type');
            assert.deepEqual(res.headers['content-security-policy'],
                "default-src 'self'; object-src 'none'; media-src *; img-src *; style-src *; frame-ancestors 'self'");
            assert.deepEqual(res.headers['x-content-security-policy'],
                "default-src 'self'; object-src 'none'; media-src *; img-src *; style-src *; frame-ancestors 'self'");
            assert.deepEqual(res.headers['x-frame-options'], 'SAMEORIGIN');
        });
}


module.exports = {
    checkHeaders: checkHeaders
};
