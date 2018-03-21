'use strict';

const preq = require('preq');
const mUtil = require('./mobile-util');

const BASE_MODULES = [
    'skins.minerva.base.reset',
    'skins.minerva.content.styles',
    'ext.math.styles',
    'ext.timeline.styles',
    'ext.pygments',
    'mobile.app'
];

const SITE_MODULES = [ 'mobile.site' ];

const ALL_MODULES = BASE_MODULES.concat(SITE_MODULES);

function load(modules, domain = 'en.wikipedia.org') {
    return preq.get(`https://${domain}/w/load.php?only=styles&modules=${modules.join('|')}`);
}

function respond(res, css) {
    res.status(200);
    mUtil.setContentType(res, mUtil.CONTENT_TYPES.css);
    mUtil.setETag(res, mUtil.hashCode(css));
    // TODO: Decide cache-control policy
    res.set('cache-control', 'public, max-age=7200, s-maxage=14400');
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
