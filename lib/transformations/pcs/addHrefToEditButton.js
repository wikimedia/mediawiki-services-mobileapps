'use strict';

const pagelib = require('../../../pagelib/build/wikimedia-page-library-transform.js');
const EditTransform = pagelib.EditTransform;
const domUtil = require('../../domUtil');

const CLASS = EditTransform.CLASS;

/**
 * Adds section headings for valid sections (with id >= 0).
 * @param {!Element} sectionElement an ancestor element for the edit button
 * @param {!number} index the zero-based index of the section
 * @param {!string} linkTitle the title of the page used for the edit link
 */
module.exports = (sectionElement, index, linkTitle) => {
    sectionElement.querySelector(`.${CLASS.LINK}`).href
        = `/w/index.php?title=${linkTitle}&action=edit&section=${index}`;
};
