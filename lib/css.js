'use strict';

const BBPromise = require('bluebird');
const readFile = BBPromise.promisify(require('fs').readFile);
const path = require('path');
const preq = require('preq');
const mUtil = require('./mobile-util');
const mwapi = require('./mwapi');

const pageLibCssFile = path.resolve(__dirname,
    '../node_modules/wikimedia-page-library/build/wikimedia-page-library-transform.css');

const BASE_MODULES = [
    'ext.cite.style',
    'ext.math.styles',
    'ext.pygments',
    'ext.timeline.styles',
    'mediawiki.page.gallery.styles',
    'mediawiki.skinning.content.parsoid',
    'mobile.app',
    'mobile.app.parsoid',
    'skins.minerva.base.reset',
    'skins.minerva.content.styles'
].sort();

const SITE_MODULES = [ 'mobile.site.styles' ].sort();

function load(modules, domain = 'en.wikipedia.org', lang = 'en') {
    const modList = modules.join('|');
    return preq.get(`https://${domain}/w/load.php?debug=false&lang=${lang}&skin=minerva&target=mobile&only=styles&modules=${modList}`);
}

function loadLocalFile(absPath) {
    return readFile(absPath, 'utf8');
}

function respond(res, css) {
    res.status(200);
    mUtil.setContentType(res, mUtil.CONTENT_TYPES.css);
    mUtil.setETag(res, mUtil.hashCode(css));
    res.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.end(css);
}

function fetchBaseCss(res) {
    return BBPromise.join(load(BASE_MODULES), loadLocalFile(pageLibCssFile),
        (remoteCssResponse, localCss) => {
            return respond(res, localCss + remoteCssResponse.body);
        });
}

function fetchMobileSiteCss(app, req, res) {
    return mwapi.getSiteInfo(app, req)
    .then(si => load(SITE_MODULES, req.params.domain, si.general.lang)
    .then(css => respond(res, css.body)));
}

module.exports = {
    fetchBaseCss,
    fetchMobileSiteCss,
    testing: {
        load,
        BASE_MODULES
    }
};
