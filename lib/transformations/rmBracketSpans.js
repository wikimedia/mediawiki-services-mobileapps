'use strict';

/**
 * Replaces something like "<span>[</span>1<span>]</span>" with "[1]".
 * This is one way to reduce the payload sent to the client.
 *
 * @param {!Document} doc the DOM document to be transformed
 */
module.exports = (doc) => {
    const ps = doc.querySelectorAll('span:not([class],[style],[id])') || [];
    for (let idx = 0; idx < ps.length; idx++) {
        const el = ps[idx];
        if (/^(\[|\])$/.test(el.textContent)) {
            const bracket = doc.createTextNode(el.textContent);
            el.parentNode.replaceChild(bracket, el);
        }
    }
};
