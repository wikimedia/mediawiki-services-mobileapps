/**
 * A function to remove dead links from Parsoid-generated HTML, which unlike PHP
 * parser HTML does not flag links to missing pages.  For this reason, we
 * deviate from the old handling of red links in hideRedLinks.js.
 */

'use strict';

/**
 * @param {Object} doc a Parsoid DOM
 * @param {Object} deadLinks an array of titles of nonexistent wiki pages
 */
function hideDeadLinks(doc, deadLinks) {
	if (deadLinks.length === 0) {
		return;
	}

	for (var i = 0; i < deadLinks.length; i++) {
		// Exclude titles containing apostrophes since they break selection
		if (deadLinks[i].indexOf("'") !== -1) {
			continue;
		}

		var instances = doc.querySelectorAll('a[title=' + deadLinks[i] + ']');
		for (var j = 0; j < instances.length; j++) {
			var replacementSpan = doc.createElement('span');
			replacementSpan.innerHTML = instances[j].innerHTML;
			replacementSpan.setAttribute('class', instances[j].getAttribute('class'));
			instances[j].parentNode.replaceChild(replacementSpan, instances[j]);
		}
	}
}

module.exports = hideDeadLinks;
