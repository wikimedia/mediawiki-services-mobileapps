'use strict';

const NodeType = require('../../nodeType');
const _ = require('underscore');

/**
 * Check whether a node has any content.
 *
 * @param {!Element} node
 * @return {!boolean} whether the node is empty after all whitespace is stripped.
 */
function isEmptyText(node) {
	return node.textContent.trim().length === 0;
}

/**
 * T295255 - Some templates insert redundant <style> tag inside empty <p> elements
 *
 * @param {!Element} node
 * @return {!boolean} whether the node children have empty text nodes.
 */
function isEmptyChild(node) {
	const walker = node.ownerDocument.createTreeWalker(node);
	let elem;
	while ((elem = walker.nextNode())) {
		if (elem.tagName === 'STYLE') {
			walker.lastChild();
		} else if (elem.nodeType ===  NodeType.TEXT_NODE && !isEmptyText(elem)) {
			// If at least one text element is present, mark this node as non-empty
			return false;
		}
	}
	return true;
}

/**
 * Extracts the first non-empty paragraph from an article and any
 * nodes that follow it that are not themselves paragraphs.
 *
 * @param {!Document} doc representing article
 * @param {boolean} removeNodes when set the lead introduction will
 *  be removed from the input DOM tree.
 * @return {string} representing article introduction
 */
module.exports = (doc, removeNodes) => {
	let p = '';
	const remove = [];
	const disallowed = [ 'P', 'TABLE', 'CENTER', 'FIGURE', 'DIV' ];
	const nodes = doc.querySelectorAll('body > p');

	Array.prototype.forEach.call(nodes, (node) => {
		let nextSibling;

		if (!p && !isEmptyChild(node) && (!(node.hasAttribute('about')) || node.querySelector('b'))) {
			p = node.outerHTML;
			remove.push(node);
			nextSibling = node.nextSibling;
			// check the next element is a text node or not in list of disallowed elements
			while (nextSibling && (nextSibling.nodeType === NodeType.TEXT_NODE ||
                disallowed.indexOf(nextSibling.tagName) === -1
			)) {
				// Deal with text nodes
				if (nextSibling.nodeType === NodeType.TEXT_NODE) {
					if (!isEmptyText(nextSibling)) {
						p += _.escape(nextSibling.textContent);
					}
				} else {
					p += nextSibling.outerHTML;
				}
				remove.push(nextSibling);
				nextSibling = nextSibling.nextSibling;
			}
		}
	});
	// cleanup all the nodes.
	if (removeNodes) {
		remove.forEach((node) => {
			node.parentNode.removeChild(node);
		});
	}
	return p;
};
