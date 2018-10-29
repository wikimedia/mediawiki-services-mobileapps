'use strict';

const domUtil = require('../../domUtil');

/**
 * Adds yet another class to the body element to determine if the page is in RTL or LTR.
 * This one is for the page library CSS. Once the apps completely moved to mobile-html then we could
 * consider removing this and changing the CSS rules in the page library instead.
 * @param {!Document} doc Parsoid DOM document
 */
module.exports = (doc) => {
    const body = doc.body;
    if (domUtil.isRTL(body)) {
        body.classList.add('content-rtl');
    } else {
        body.classList.add('content-ltr');
    }
};
