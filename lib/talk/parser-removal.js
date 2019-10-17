const NodeType = require('../nodeType');
const relationships = require('./parser-relationships');

/**
 * Remove element preserving its contents.
 * @param  {!Element} element
 */
const removeElementNonDestructively = element => {
  // Could also use `element.replaceWith(...element.childNodes)` here, but
  // faster to avoid `childNodes` per:
  // https://github.com/fgnass/domino#optimization
  while (element.hasChildNodes()) {
    element.parentNode.insertBefore(element.lastChild, element.nextSibling);
  }
  element.parentNode.removeChild(element);
};

/**
 * Remove elements preserving their contents.
 * @param  {[!Element]} elements
 */
 const removeElementsNonDestructively = elements => {
  let i = elements.length;
  while (i--) {
    removeElementNonDestructively(elements[i]);
  }
 };

/**
 * Gets clone of element cleaned of all non-text/non-anchor nodes.
 * Useful for checking if element ends with text/anchors indicating the element is the end of a
 * reply (otherwise other formatting html can make this harder to check).
 * @param  {!Element} element
 * @return {!Element}
 */
const getCloneWithAnchorsAndTextNodesOnly = element => {
  const clone = element.cloneNode(true);
  let nonAnchors = clone.querySelectorAll('*:not(a)');
  removeElementsNonDestructively(nonAnchors);
  return clone;
};

/**
 * The subset of html tag types the endpoint does not remove.
 */
const textContentTagsToPreserve = new Set(['A', 'B', 'I', 'SUP', 'SUB']);

/**
 * Custom version of `textContent` for preserving only certain tags.
 * @param  {!Element} rootNode
 * @param  {!Document} doc
 * @return {!string}
 */
const customTextContent = (rootNode, doc) => {
  if (!rootNode || !rootNode.hasChildNodes()) {
    return '';
  }
  let output = '';
  let childNode = rootNode.firstChild;
  while (childNode) {
    // eslint-disable-next-line no-use-before-define
    output += textFromNode(childNode, textContentTagsToPreserve, doc);
    childNode = childNode.nextSibling;
  }
  return output;
};

/**
 * After removing tags which are not preserved some anchors can have no text - for example, if the
 * anchor only contained an image. In these cases use the href filename for the anchor text.
 * @param  {!Element} anchorElement
 * @return {!string}
 */
const textForTextlessAnchor = anchorElement => {
  const fileName = anchorElement.href.substring(anchorElement.href.lastIndexOf('/') + 1);
  return `[${fileName}]`;
};

const textFromPreservedElementNode = (elementNode, doc) => {
  const clone = elementNode.cloneNode(true);
  let text = customTextContent(clone, doc);
  const isTextlessAnchor = clone.tagName === 'A' && text.length === 0;
  if (isTextlessAnchor) {
    text = textForTextlessAnchor(clone);
  }
  clone.innerHTML = text;
  return clone.outerHTML;
};

const escapeLessThanGreaterThanAndAmpersand = text => text
  .replace(/&/g,'&amp;')
  .replace(/</g,'&lt;')
  .replace(/>/g,'&gt;');

const textFromTextNode = textNode => escapeLessThanGreaterThanAndAmpersand(textNode.nodeValue);

class TalkTagWrappingPair {
  constructor(fromTag, toTag) {
    this.fromTag = fromTag;
    this.toTag = toTag;
  }
  nodeTagNameIsFromTag(node) {
    return node.tagName === this.fromTag;
  }
  isElementNodeWrappable(elementNode) {
    if (elementNode.tagName !== this.fromTag) {
      return false;
    }
    const isAlreadyWrapped = relationships.getFamilyTree(elementNode)
      .find((e, i) => i > 0 && e.tagName === this.toTag);
    if (isAlreadyWrapped) {
      return false;
    }
    const alreadyContainsToTagElements = elementNode.querySelectorAll(this.toTag).length > 0;
    if (alreadyContainsToTagElements) {
      // Wrapping in this case would make the contained elements no longer stand out.
      return false;
    }
    return true;
  }
  textFromElementNodeWrappedInToTag(elementNode, doc) {
    const wrapper = doc.createElement(this.toTag);
    wrapper.innerHTML = customTextContent(elementNode, doc);
    return wrapper.outerHTML;
  }
}

const tagWrappingPairs = [
  new TalkTagWrappingPair('DT', 'B'),
  new TalkTagWrappingPair('CODE', 'B'),
  new TalkTagWrappingPair('BIG', 'B')
];

const textFromNode = (node, tagsToPreserve, doc) => {
  switch (node.nodeType) {
    case NodeType.TEXT_NODE:
      return textFromTextNode(node);
    case NodeType.ELEMENT_NODE: {
      if (node.tagName === 'STYLE') {
        return '';
      }

      if (tagsToPreserve.has(node.tagName)) {
        return textFromPreservedElementNode(node, doc);
      }

      const pair = tagWrappingPairs
        .find(pair => pair.nodeTagNameIsFromTag(node) && pair.isElementNodeWrappable(node));

      if (pair) {
        return pair.textFromElementNodeWrappedInToTag(node, doc);
      }
      return customTextContent(node, doc);
    }
    default:
  }
  return '';
};

// If a parent element contains only a BR, replace the parent with just the BR.
const replaceElementsContainingOnlyOneBreakWithBreak = doc => {
  const breaks = doc.querySelectorAll('br');
  for (let i = 0; i < breaks.length; ++i) {
    const br = breaks[i];
    if (!br.nextSibling && !br.previousSibling) {
      removeElementNonDestructively(br.parentElement);
    }
  }
};

module.exports = {
  escapeLessThanGreaterThanAndAmpersand,
  customTextContent,
  textFromTextNode,
  textFromPreservedElementNode,
  removeElementsNonDestructively,
  getCloneWithAnchorsAndTextNodesOnly,
  replaceElementsContainingOnlyOneBreakWithBreak
};
