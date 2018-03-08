'use strict';

const preq = require('preq');
const mUtil = require('./mobile-util');

const BASE_MODULES = [
    'skins.minerva.base.reset',
    'skins.minerva.content.styles',
    'ext.math.styles',
    'ext.timeline.styles',
    'ext.pygments'
];

const PAGE_VIEW_MODULES = [];

const PREVIEW_MODULES = [
    'mobile.app.preview'
];

const BASE_URL = 'https://mediawiki.org/w/load.php';

const load = modules => preq.get(`${BASE_URL}?only=styles&modules=${modules.join('|')}`);

const respond = (res, css) => {
    res.status(200);
    mUtil.setContentType(res, mUtil.CONTENT_TYPES.css);
    mUtil.setETag(res, mUtil.hashCode(css));
    // TODO: Decide cache-control policy
    res.set('cache-control', 'public, max-age=7200, s-maxage=14400');
    res.end(css);
};

const fetchBaseCss = (res) => {
    load(BASE_MODULES).then(css => respond(res, css.body));
};

const fetchPageViewCss = (res) => {
    load(PAGE_VIEW_MODULES).then(css => respond(res, css.body));
};

const fetchPreviewCss = (res) => {
    load(PREVIEW_MODULES).then(css => respond(res, css.body));
};

module.exports = {
    fetchBaseCss,
    fetchPageViewCss,
    fetchPreviewCss
};
