'use strict';

module.exports = (document) => {
    const refLists = document.querySelectorAll('.reflist');
    if (refLists) {
        Array.from(refLists).map(refList => {
            const section = refList.closest('section[data-mw-section-id]');
            const clone = section.cloneNode(true);
            // remove reflist and pagelib_edit_section_header from cloned section
            const classesToRemove = ['.reflist', '.pagelib_edit_section_header'];
            classesToRemove.map(className => {
                const elem = clone.querySelector(className);
                if (elem) {
                    clone.removeChild(elem);
                }
            });
            // check if clone has no children
            if (!clone.childElementCount) {
                section.classList.add('pagelib_hide_section');
            }
        });
    }
};
