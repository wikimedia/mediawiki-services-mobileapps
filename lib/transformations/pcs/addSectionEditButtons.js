'use strict';

const EditTransform = require('wikimedia-page-library').EditTransform;

const CLASS = EditTransform.CLASS;

/**
 * Wraps section heading into a div if found.
 * @param {!Document} document Parsoid DOM document
 * @param {!Element} sectionElement the <section> element
 * @param {!number} index the zero-based index of the section
 * @return {?HTMLDivElement} new header wrapper or undefined if no heading was found
 */
const wrapSectionHeader = (document, sectionElement, index) => {
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

    return divElement;
};

/**
 * If the  nearest ancestor to the given element has a class set for Right-to-Left mode or not.
 * @param {!Element} element a DOM element
 */
function isRTL(element) {
    const closestDirectionalAncestor = element.closest('[dir]');
    if (closestDirectionalAncestor) {
        return closestDirectionalAncestor.getAttribute('dir') === 'rtl';
    }
    return false;
}

/**
 * Sets the inline style to the element to float left or right.
 * This makes the lead section text wrap about the element.
 * @param {!Element} element
 * @param {?boolean} floatLeft to float left; else right.
 */
function floatElement(element, floatLeft) {
    const floatValue = floatLeft ? 'left' : 'right';
    element.setAttribute('style', `float: ${floatValue};`);
}

/**
 * Adds the section edit button for one section.
 * For the lead section:
 *   Don't set headerWrapper. Will add the button as first child of section.
 * For other sections:
 *   Set the headerWrapper. Will add the button to the end of headerWrapper.
 * @param {!Document} document Parsoid DOM document
 * @param {!Element} sectionElement the <section> element
 * @param {!number} index the zero-based index of the section
 * @param {?Element} headerWrapper
 */
const addOneSectionEditButton = (document, sectionElement, index, headerWrapper) => {
    const button = EditTransform.newEditSectionButton(document, index);
    if (headerWrapper) {
        headerWrapper.appendChild(button);
    } else {
        // lead section:
        sectionElement.insertBefore(button, sectionElement.firstChild);
        floatElement(button, isRTL(sectionElement));
    }
};

/**
 * Adds section headings for valid sections (with id >= 0).
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
        if (sectionID >= 0) {
            const headerWrapper = wrapSectionHeader(document, sectionElement, sectionID);
            addOneSectionEditButton(document, sectionElement, sectionID, headerWrapper);
            addHrefToEditButton(sectionElement, sectionID, linkTitle);
        }
    });
};

module.exports = {
    addSectionEditButtons,
    isRTL
};
