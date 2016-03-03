/**
 * A function to remove dead links from Parsoid-generated HTML, which unlike PHP
 * parser HTML does not flag links to missing pages.  For this reason, we
 * deviate from the old handling of red links in hideRedLinks.js.
 */

'use strict';

/**
 * @param {Object} content a section DOM
 * @param {Object} deadLinks an array (possibly empty) of strings to
 *   nonexistent wiki pages
 */
function hideDeadLinks(content, deadLinks) {
	if (deadLinks.length === 0) {
		return;
	}

	var anchors = content.querySelectorAll('a');
	for (var i = 0; i < anchors.length; i++) {
		var anchor = anchors[i];
		if (deadLinks.indexOf(anchor.title) !== -1) {
			var replacementSpan = content.createElement('span');
			replacementSpan.innerHTML = anchor.innerHTML;
			replacementSpan.setAttribute('class', anchor.getAttribute('class'));
			anchor.parentNode.replaceChild(replacementSpan, anchor);
		}
	}
}

module.exports = {
	hideDeadLinks: hideDeadLinks
};
