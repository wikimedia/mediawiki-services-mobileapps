'use strict';

const fs = require('fs');
const mUtil = require('./mobile-util');

const pageLibJs = `${__dirname}/../pagelib/build/wikimedia-page-library-pcs.js`;
const pageLibLegacyJs = `${__dirname}/../pagelib/legacy/legacy-pagelib.js`;
const componentLibJs = `${__dirname}/../pagelib/build/wikimedia-page-library-components.js`;
const webComponentLibJs = `${__dirname}/../pagelib/build/wikimedia-page-library-components-lit.js`;
const vendorLibJs = `${__dirname}/../pagelib/build/wikimedia-page-library-vendor.js`;

function respond(res, js) {
    res.status(200);
    mUtil.setContentType(res, mUtil.CONTENT_TYPES.javascript);
    mUtil.setETag(res, mUtil.hashCode(js));
    res.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.end(js);
}

// Freeze pagelib for old versions of the Android app
function fetchLegacyPageLibJs(res) {
    fs.readFile(pageLibLegacyJs, { encoding: 'utf8' }, (err, data) => respond(res, data));
}

function fetchPageLibJs(res) {
    fs.readFile(pageLibJs, { encoding: 'utf8' }, (err, data) => respond(res, data));
}

function fetchComponentLibJs(res) {
    fs.readFile(componentLibJs, { encoding: 'utf8' }, (err, data) => respond(res, data));
}

function fetchWebComponentLibJs(res) {
    fs.readFile(webComponentLibJs, { encoding: 'utf8' }, (err, data) => respond(res, data));
}

function fetchVendorLibJs(res) {
    fs.readFile(vendorLibJs, { encoding: 'utf8' }, (err, data) => respond(res, data));
}

module.exports = {
    fetchLegacyPageLibJs,
    fetchPageLibJs,
    fetchComponentLibJs,
    fetchWebComponentLibJs,
    fetchVendorLibJs
};
