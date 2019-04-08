'use strict';

const fs = require('fs');
const preq = require('preq');
const mUtil = require('./mobile-util');
const mwapi = require('./mwapi');

const pageLibJs = require.resolve('wikimedia-page-library');
// HACK: Get the corresponding .css file to the pagelib main .js file by swapping the file extension
const pageLibCss = pageLibJs.replace(/\.js$/, '.css');

const SITE_MODULES = [ 'mobile.site.styles' ];

function load(modules, domain = 'en.wikipedia.org', lang = 'en') {
    const modList = modules.join('|');
    return preq.get(`https://${domain}/w/load.php?debug=false&lang=${lang}&skin=minerva&target=mobile&only=styles&modules=${modList}`);
}

function respond(res, css) {
    res.status(200);
    mUtil.setContentType(res, mUtil.CONTENT_TYPES.css);
    mUtil.setETag(res, mUtil.hashCode(css));
    res.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.end(css);
}

function fetchBaseCss(res) {
    let fname = `${__dirname}/../private/base.css`;
    fs.readFile(fname, { encoding: 'utf8' }, (err, data) => respond(res, data));
}

function fetchMobileSiteCss(app, req, res) {
    return mwapi.getSiteInfo(app, req)
    .then(si => load(SITE_MODULES, req.params.domain, si.general.lang)
    .then(css => respond(res, css.body)));
}

function fetchPageLibCss(res) {
    fs.readFile(pageLibCss, { encoding: 'utf8' }, (err, data) => respond(res, data));
}

module.exports = {
    fetchBaseCss,
    fetchMobileSiteCss,
    fetchPageLibCss,
    respond,
    testing: {
        load,
        SITE_MODULES
    }
};
