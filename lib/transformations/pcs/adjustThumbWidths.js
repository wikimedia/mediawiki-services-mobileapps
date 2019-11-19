'use strict';

const scaleThumb = require('../../media').scaleThumb;

module.exports = (doc) => {
    const imgs = doc.querySelectorAll('img');
    [].forEach.call(imgs, (img) => {
        scaleThumb(img);
    });
};
