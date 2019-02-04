'use strict';

const preq = require('preq');
const mUtil = require('./mobile-util');
const mwapi = require('./mwapi');

/**
 * Fixes T214728. Remove some time after Android releases fix for it.
 * baseline .content
 */
const hotFixCssString = `
html, body {
   height: unset !important;
}
.content {
  background-color: unset !important;
}`;

const BASE_MODULES = [
    'skins.minerva.base.styles', // https://phabricator.wikimedia.org/T214728#
    'skins.minerva.content.styles',
    'mediawiki.page.gallery.styles',
    'mediawiki.skinning.content.parsoid',
    'ext.cite.style',
    'ext.math.styles',
    'ext.pygments',
    'ext.timeline.styles',
    'mobile.app',
    'mobile.app.parsoid'
];

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
    return load(BASE_MODULES).then(remoteCssResponse =>
        respond(res, remoteCssResponse.body + hotFixCssString));
}

function fetchMobileSiteCss(app, req, res) {
    return mwapi.getSiteInfo(app, req)
    .then(si => load(SITE_MODULES, req.params.domain, si.general.lang)
    .then(css => respond(res, css.body)));
}

module.exports = {
    fetchBaseCss,
    fetchMobileSiteCss,
    respond,
    testing: {
        load,
        BASE_MODULES
    }
};
