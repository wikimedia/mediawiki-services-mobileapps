'use strict';

const preq = require('preq');
const mUtil = require('./mobile-util');
const mwapi = require('./mwapi');

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

function respond(res, css) {
    res.status(200);
    mUtil.setContentType(res, mUtil.CONTENT_TYPES.css);
    mUtil.setETag(res, mUtil.hashCode(css));
    res.set('cache-control', 'public, max-age=86400, s-maxage=86400');
    res.end(css);
}

function fetchBaseCss(res) {
    load(BASE_MODULES).then(css => respond(res, css.body));
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
