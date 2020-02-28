// Node is undefined in Node.js
const NODE_TYPE = {
  ELEMENT_NODE: 1,
  TEXT_NODE: 3
}

/**
 * Determines if node is either an element or text node.
 * @param  {!Node} node
 * @return {!boolean}
 */
const isNodeTypeElementOrText = node =>
  node.nodeType === NODE_TYPE.ELEMENT_NODE || node.nodeType === NODE_TYPE.TEXT_NODE

export default {
  isNodeTypeElementOrText,
  NODE_TYPE
}