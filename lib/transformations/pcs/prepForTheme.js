'use strict';

const ThemeTransform = require('wikimedia-page-library').ThemeTransform;

const prepForTheme = (document) => {
    // HACK: The pagelib CSS for themes depends on a content class. Adding this to the body
    // for now. Should we add a <div class="content"> around the section tags or add that class
    // to all section elements?
    document.body.classList.add('content');

    ThemeTransform.classifyElements(document.body);
};

module.exports = prepForTheme;
