'use strict';

const EditTransform = require('wikimedia-page-library').EditTransform;

const CLASS = EditTransform.CLASS;

/**
 * Adds section headings
 * @param {!Document} document Parsoid DOM document
 * @param {!Element} sectionElement the <section> element
 * @param {!number} index the zero-based index of the section
 */
const addOneSectionEditButton = (document, sectionElement, index) => {
    const rootSel = `section[data-mw-section-id="${index}"]`;
    const headingElement = sectionElement.querySelector(
        `${rootSel}>h1,${rootSel}>h2,${rootSel}>h3,${rootSel}>h4,${rootSel}>h5,${rootSel}>h6`);
    if (!headingElement) {
        return;
    }

    // TODO: HEADER would probably be more appropriate, but keeping in sync with page lib for now
    const divElement = document.createElement('div');
    divElement.className = CLASS.SECTION_HEADER;

    // Make new <div> the first child element of this section
    sectionElement.insertBefore(divElement, headingElement);
    // Move heading (<h?>) under <div>
    divElement.appendChild(headingElement);
    // TODO: currently only here for CSS. Consider removing and changing the CSS selector instead
    headingElement.classList.add(CLASS.TITLE);

    const button = EditTransform.newEditSectionButton(document, index);
    divElement.appendChild(button);
};

/**
 * Adds section headings for sections with id > 0.
 * @param {!Element} sectionElement an ancestor element for the edit button
 * @param {!number} index the zero-based index of the section
 * @param {!string} linkTitle the title of the page used for the edit link
 */
function addHrefToEditButton(sectionElement, index, linkTitle) {
    sectionElement.querySelector(`.${CLASS.LINK}`).href
        = `/w/index.php?title=${linkTitle}&action=edit&section=${index}`;
}

/**
 * Adds section headings for sections with id > 0.
 * @param {!Document} document Parsoid DOM document
 * @param {!string} linkTitle the title of the page used for the edit link
 */
const addSectionEditButtons = (document, linkTitle) => {
    const sections = Array.from(document.querySelectorAll('section[data-mw-section-id]'));
    sections.forEach((sectionElement) => {
        const sectionID = sectionElement.getAttribute('data-mw-section-id');
        if (sectionID > 0) {
            addOneSectionEditButton(document, sectionElement, sectionID);
            addHrefToEditButton(sectionElement, sectionID, linkTitle);
        }
    });
};

module.exports = addSectionEditButtons;
