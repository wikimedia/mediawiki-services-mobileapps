'use strict';

/**
 * Scan an array of sections and add an isReferenceSection property to any sections that
 * contain references.
 *
 * @param {!Array} sections to scan for references
 * @param {?boolean} [removeText] whether to remove references from the section text after marking
 */
module.exports = (sections, removeText) => {
    const topHeadingLevel = sections[0].toclevel;
    let isReferenceSection = false;
    let lastTopLevelSection;

    function mark(from, to) {
        if (isReferenceSection && from !== undefined) {
            // Mark all the sections between the last heading and this one as reference sections
            sections.slice(from, to).forEach((section) => {
                section.isReferenceSection = true;
                if (removeText) {
                    delete section.text;
                }
            });
        }
    }

    sections.forEach((section, i) => {
        const text = section.text;
        if (section.toclevel === topHeadingLevel) {
            mark(lastTopLevelSection, i);
            // reset the top level section and begin the hunt for references again.
            lastTopLevelSection = i;
            isReferenceSection = false;
        }
        if (text.indexOf('class="mw-references') > -1 || text.indexOf('class="refbegin') > -1) {
            isReferenceSection = true;
        }
    });
    // the last section may have been a reference section
    mark(lastTopLevelSection, sections.length);
};
