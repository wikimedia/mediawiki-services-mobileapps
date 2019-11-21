const NodeType = require('../nodeType');

/**
 * A Chunk is a light weight wrapper around a DOM node that is useful for forming a linear
 * representation of a DOM.
 * @param {!DOMNode} node the node this chunk represents
 * @param {!boolean} isEnd does this represent the end or start of the node
 */
class Chunk {
  constructor(node, isEnd) {
    if (node.nodeType === NodeType.TEXT_NODE) {
      this.isText = true;
      this.text = node.textContent;
    } else if (node.nodeType === NodeType.ELEMENT_NODE) {
      this.node = node;
      this.isTag = true;
      this.isEnd = isEnd;
      this.tagName = node.tagName;
    }
  }

  get attributes() {
    if (!this.node || !this.node.attributes) {
      return [];
    }
    return Array.from(this.node.attributes);
  }

  getAttribute(attributeName) {
    return this.node.getAttribute(attributeName);
  }

  get debugText() {
    return this.isText ? this.text : `${this.isEnd ? '</' : '<'}${this.tagName}>`;
  }
}

module.exports = Chunk;
