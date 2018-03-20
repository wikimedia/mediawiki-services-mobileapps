'use strict';

const preq = require('preq');
const mUtil = require('./mobile-util');

const BASE_MODULES = [
    'skins.minerva.base.reset',
    'skins.minerva.content.styles',
    'mediawiki.page.gallery.styles',
    'mediawiki.skinning.content.parsoid',
    'ext.cite.style',
    'ext.math.styles',
    'ext.timeline.styles',
    'ext.pygments',
    'mobile.app',
    'mobile.app.parsoid'
];

const SITE_MODULES = [ 'mobile.site' ];

const ALL_MODULES = BASE_MODULES.concat(SITE_MODULES);

function load(modules, domain = 'en.wikipedia.org') {
    const modList = modules.join('|');
    return preq.get(`https://${domain}/w/load.php?skin=minerva&target=mobile&only=styles&modules=${modList}`);
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

function fetchMobileSiteCss(req, res) {
    load(SITE_MODULES, req.params.domain).then(css => respond(res, css.body));
}

function fetchMobileAppBundle(req, res) {
    load(ALL_MODULES, req.params.domain).then(css => respond(res, css.body));
}

module.exports = {
    fetchBaseCss,
    fetchMobileSiteCss,
    fetchMobileAppBundle
};
