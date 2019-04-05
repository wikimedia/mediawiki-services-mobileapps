'use strict';

const fs = require('fs');
const mUtil = require('./mobile-util');

function respond(res, js) {
    res.status(200);
    mUtil.setContentType(res, mUtil.CONTENT_TYPES.javascript);
    mUtil.setETag(res, mUtil.hashCode(js));
    res.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.end(js);
}

function fetchPageLibJs(res) {
    const path = require.resolve('wikimedia-page-library');
    fs.readFile(path, { encoding: 'utf8' }, (err, data) => respond(res, data));
}

module.exports = {
    fetchPageLibJs
};
