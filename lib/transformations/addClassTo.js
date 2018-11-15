'use strict';

module.exports = (doc, selector, className) => {
    const ps = doc.querySelectorAll(selector) || [];
    for (let idx = 0; idx < ps.length; idx++) {
        const node = ps[idx];
        node.classList.add(className);
    }
};
