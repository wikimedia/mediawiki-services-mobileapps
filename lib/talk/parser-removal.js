const NodeType = require('../nodeType');
const relationships = require('./parser-relationships');

/**
 * Removes elements preserving their contents.
 * @param  {[!Element]} elementsArray
 */
const removeElementsNonDestructively = elementsArray => {
  elementsArray.reverse().forEach(e => {
    Array.from(e.childNodes).reverse().forEach(cn => {
      e.parentNode.insertBefore(cn, e.nextSibling);
    });
    e.parentNode.removeChild(e);
  });
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
  const nonAnchors = Array.from(clone.querySelectorAll('*')).filter(e => e.tagName !== 'A');
  removeElementsNonDestructively(nonAnchors);
  return clone;
};

/**
 * The subset of html tag types the endpoint does not remove.
 */
const textContentTagsToPreserve = ['A', 'B', 'I', 'SUP', 'SUB'];

/**
 * Custom version of `textContent` for preserving only certain tags.
 * @param  {!Element} rootNode
 * @param  {!Document} doc
 * @param  {[!string]} exclusions Array of tags to be subtracted from preserved tags.
 * @return {!string}
 */
const customTextContent = (rootNode, doc, exclusions = []) => {
  if (!rootNode || !rootNode.childNodes) {
    return '';
  }
  const tagsToPreserve = textContentTagsToPreserve.filter(tag => !exclusions.includes(tag));
  return rootNode.childNodes
    // eslint-disable-next-line no-use-before-define
    .map(childNode => textFromNode(childNode, tagsToPreserve, doc))
    .join('');
};

/**
 * Specific attributes to be removed.
 */
const attributesToRemove = ['style','id','class','rel','about','data-mw','typeof'];

/**
 * Prune specific attributes from an element.
 * @param  {Element} element
 */
const pruneUnwantedAttributes =
  element => attributesToRemove.forEach(attribute => element.removeAttribute(attribute));

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
  pruneUnwantedAttributes(clone);
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

      if (tagsToPreserve.includes(node.tagName)) {
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
  Array.from(doc.querySelectorAll('br'))
    .filter(br => br.parentElement.childNodes.length === 1)
    .forEach(br => removeElementsNonDestructively([br.parentElement]));
};

module.exports = {
  escapeLessThanGreaterThanAndAmpersand,
  customTextContent,
  textFromTextNode,
  pruneUnwantedAttributes,
  textFromPreservedElementNode,
  removeElementsNonDestructively,
  getCloneWithAnchorsAndTextNodesOnly,
  replaceElementsContainingOnlyOneBreakWithBreak
};
