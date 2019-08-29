'use strict';

const fs = require('fs');
const preq = require('preq');
const mUtil = require('./mobile-util');
const mwapi = require('./mwapi');
const path = require('path');

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

function fetchMobileSiteCss(req, res) {
    return mwapi.getSiteInfo(req)
    .then(si => load(SITE_MODULES, req.params.domain, si.general.lang)
    .then(css => respond(res, css.body)));
}

function fetchPageLibCss(res) {
  const filePath = path.resolve(require.resolve('wikimedia-page-library'),
    '../wpl_pcs.css');
    fs.readFile(filePath, { encoding: 'utf8' }, (err, data) => respond(res, data));
}

function fetchPageLibPostCss(res) {
    const filePath = path.resolve(require.resolve('wikimedia-page-library'),
      '../wpl_pcs_post.css');
    fs.readFile(filePath, { encoding: 'utf8' }, (err, data) => respond(res, data));
}

module.exports = {
    fetchBaseCss,
    fetchMobileSiteCss,
    fetchPageLibCss,
    fetchPageLibPostCss,
    respond,
    testing: {
        load,
        SITE_MODULES
    }
};
