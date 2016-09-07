/**
 * DOM transformation shared with app. Let's keep this in sync with the app.
 * Last sync: Android repo 601c663 www/js/transforms/hideIPA.js
 *
 * The main change from the original Android app file is to use
 * content.createElement() instead of document.createElement().
 * Had to change the ipa_button element from a div to a span since the
 * div caused layout flow issues on the client side.
 */

'use strict';

/**
 * @param {Document} content
 * @param {Boolean} [legacy]
 */
function hideIPA(content, legacy) {
    const spans = content.querySelectorAll("span.IPA");
    for (let i = 0; i < spans.length; i++) {
        const parentSpan = spans[i].parentNode;
        if (parentSpan === null) {
            continue;
        }
        let doTransform = false;
        // case 1: we have a sequence of IPA spans contained in a parent "nowrap" span
        if (parentSpan.tagName === "SPAN" && spans[i].classList.contains('nopopups')) {
            doTransform = true;
        }
        if (parentSpan.style.display === 'none') {
            doTransform = false;
        }
        if (!doTransform) {
            continue;
        }

        // we have a new IPA span!

        const containerSpan = content.createElement('span');
        parentSpan.parentNode.insertBefore(containerSpan, parentSpan);
        parentSpan.parentNode.removeChild(parentSpan);

        // create and add the button
        const buttonDiv = content.createElement('span');
        buttonDiv.classList.add('ipa_button');
        containerSpan.appendChild(buttonDiv);
        containerSpan.appendChild(parentSpan);

        if (legacy) {
            parentSpan.style.display = 'none';
        }
        // markup parent with class so that it can be hidden if required
        const parentSpanClass = parentSpan.className;
        parentSpan.className = parentSpanClass ? `${parentSpanClass} mcs-ipa` : 'mcs-ipa';
    }
}

module.exports = {
    hideIPA
};
