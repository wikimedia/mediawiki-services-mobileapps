'use strict';

module.exports = (document) => {
    Array.from(document.querySelectorAll('section'))
        .filter(s => s.querySelector('.reflist'))
        .forEach(section => {
            let foundNonRefListSection = false;
            let cur = section.firstElementChild;
            while (cur) {
                if (!(cur.classList.contains('reflist')
                        || cur.classList.contains('pagelib_edit_section_header'))) {
                    foundNonRefListSection = true;
                }
                cur = cur.nextElementSibling;
            }
            if (!foundNonRefListSection) {
                section.classList.add('pagelib_hide_section');
            }
    });
};
