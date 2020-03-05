const ELEMENT_NODE = 1

/**
 * Determine if paragraph is the one we are interested in.
 * @param  {!HTMLParagraphElement}  paragraphElement
 * @return {!boolean}
 */
const isParagraphEligible = paragraphElement => {
  // Ignore 'coordinates' which are presently hidden. See enwiki 'Bolton Field' and 'Sharya Forest
  // Museum Railway'. Not counting coordinates towards the eligible P min textContent length
  // heuristic has dual effect of P's containing only coordinates being rejected, and P's containing
  // coordinates but also other elements meeting the eligible P min textContent length being
  // accepted.
  const coordElement = paragraphElement.querySelector('[id="coordinates"]')
  const coordTextLength = !coordElement ? 0 : coordElement.textContent.length

  // Ensures the paragraph has at least a little text. Otherwise silly things like a empty P or P
  // which only contains a BR tag will get pulled up. See enwiki 'Hawaii', 'United States',
  // 'Academy (educational institution)', 'Lovászpatona'
  const minEligibleTextLength = 50
  const hasEnoughEligibleText =
    paragraphElement.textContent.length - coordTextLength >= minEligibleTextLength
  return hasEnoughEligibleText
}

/**
 * Nodes we want to move up. This includes the `eligibleParagraph` and everything up to (but not
 * including) the next paragraph.
 * @param  {!HTMLParagraphElement} eligibleParagraph
 * @return {!Array.<Node>} Array of text nodes, elements, etc...
 */
const extractLeadIntroductionNodes = eligibleParagraph => {
  const introNodes = []
  let node = eligibleParagraph
  do {
    introNodes.push(node)
    node = node.nextSibling
  } while (node && !(node.nodeType === ELEMENT_NODE && node.tagName === 'P'))
  return introNodes
}

/**
 * Locate first eligible paragraph. We don't want paragraphs from somewhere in the middle of a
 * table, so only paragraphs which are direct children of `element` element are considered.
 * @param  {!Document} document
 * @param  {!Element} container the section under examination.
 * @return {?HTMLParagraphElement}
 */
const getEligibleParagraph = (document, container) => {
  if (!container) {
    return
  }

  let el = container.firstElementChild
  while (el) {
    if (el.tagName === 'P' && isParagraphEligible(el)) {
      return el
    }
    el = el.nextElementSibling
  }
}


/**
 * Instead of moving the infobox down beneath the first P tag, move the first eligible P tag
 * (and related elements) up. This ensures some text will appear above infoboxes, tables, images
 * etc. This method does not do a 'mainpage' check - do so before calling it.
 * @param  {!Document} document
 * @param  {!Element} container the section under examination.
 * @param  {?Element} afterElement Element after which paragraph will be moved. If not specified
 * paragraph will be move to top of `containerID` element.
 * @return {void}
 */
const moveLeadIntroductionUp = (document, container, afterElement) => {
  const eligibleParagraph = getEligibleParagraph(document, container)
  if (!eligibleParagraph) {
    return
  }

  // A light-weight fragment to hold everything we want to move up.
  const fragment = document.createDocumentFragment()
  // DocumentFragment's `appendChild` attaches the element to the fragment AND removes it from DOM.
  /* DOM sink status: safe - content transform with no user interference */
  extractLeadIntroductionNodes(eligibleParagraph).forEach(element => fragment.appendChild(element))

  const insertBeforeThisElement = !afterElement ? container.firstChild : afterElement.nextSibling

  // Attach the fragment just before `insertBeforeThisElement`. Conveniently, `insertBefore` on a
  // DocumentFragment inserts 'the children of the fragment, not the fragment itself.', so no
  // unnecessary container element is introduced.
  // https://developer.mozilla.org/en-US/docs/Web/API/DocumentFragment
  container.insertBefore(fragment, insertBeforeThisElement)
}

export default {
  moveLeadIntroductionUp,
  test: {
    isParagraphEligible,
    extractLeadIntroductionNodes,
    getEligibleParagraph
  }
}