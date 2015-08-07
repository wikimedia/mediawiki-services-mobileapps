'use strict';


var assert = require('./assert.js');
var preq   = require('preq');


/** Gets the gallery content from MW API */
function checkHeaders(uri, expContentType) {
    return preq.get({ uri: uri })
        .then(function(res) {
            assert.deepEqual(res.status, 200);
            assert.contentType(res, expContentType);
            assert.deepEqual(res.headers['access-control-allow-origin'], '*');
            assert.deepEqual(res.headers['access-control-allow-headers'], 'Accept, X-Requested-With, Content-Type');
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