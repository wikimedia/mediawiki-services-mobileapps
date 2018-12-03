'use strict';

const mUtil = require('./mobile-util');
const pageLib = require('./pagelibServer');

function respond(res, js) {
    res.status(200);
    mUtil.setContentType(res, mUtil.CONTENT_TYPES.javascript);
    mUtil.setETag(res, mUtil.hashCode(js));
    res.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.end(js);
}

function fetchPageLibJs(res) {
    return pageLib.loadJavascript()
    .then(localJs => respond(res, localJs));
}

module.exports = {
    fetchPageLibJs
};
