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


/**
 * Get node's bounding rect as a plain object.
 * @param {!Node} node
 * @return {!Object<string, number>}
 */
const getBoundingClientRectAsPlainObject = node => {
  const rect = node.getBoundingClientRect()
  return {
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    x: rect.x,
    y: rect.y
  }
}

export default {
  isNodeTypeElementOrText,
  getBoundingClientRectAsPlainObject,
  NODE_TYPE
}