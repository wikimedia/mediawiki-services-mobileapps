'use strict';

const pagelib = require('../../../pagelib/build/wikimedia-page-library-transform.js');
const LeadIntroductionTransform = pagelib.LeadIntroductionTransform;

/**
 * Instead of moving the infobox down beneath the first P tag, move the first eligible P tag
 * (and related elements) up. This ensures some text will appear above infoboxes, tables, images
 * etc. This method does not do a 'mainpage' check - so avoid calling it on main pages.
 * @param {!Document} document Parsoid DOM document with the lead section in a section tag
 * with data-mw-section-id=0
 */
module.exports = (document) => {
    const leadSectionEl = document.querySelector('section[data-mw-section-id=0]');
    if (!leadSectionEl) {
        return;
    }
    LeadIntroductionTransform.moveLeadIntroductionUp(document, leadSectionEl);
};
