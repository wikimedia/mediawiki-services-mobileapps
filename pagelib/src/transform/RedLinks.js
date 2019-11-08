import Polyfill from './Polyfill'

/**
 * Configures span to be suitable replacement for red link anchor.
 * @param {!HTMLSpanElement} span The span element to configure as anchor replacement.
 * @param {!HTMLAnchorElement} anchor The anchor element being replaced.
 * @return {void}
 */
const configureRedLinkTemplate = (span, anchor) => {
  span.innerHTML = anchor.innerHTML
  span.setAttribute('class', anchor.getAttribute('class'))
}

/**
 * Finds red links in a document.
 * @param {!Document} content Document in which to seek red links.
 * @return {!Array.<HTMLAnchorElement>} Array of zero or more red link anchors.
 */
const redLinkAnchorsInDocument = content => Polyfill.querySelectorAll(content, 'a.new')

/**
 * Makes span to be used as cloning template for red link anchor replacements.
 * @param  {!Document} document Document to use to create span element.
 * @return {!HTMLSpanElement} Span element suitable for use as template for red link anchor
 * replacements.
 */
const newRedLinkTemplate = document => document.createElement('span')

/**
 * Replaces anchor with span.
 * @param  {!HTMLAnchorElement} anchor Anchor element.
 * @param  {!HTMLSpanElement} span Span element.
 * @return {void}
 */
const replaceAnchorWithSpan = (anchor, span) => anchor.parentNode.replaceChild(span, anchor)

/**
 * Hides red link anchors in a document so they are unclickable and unfocusable.
 * @param {!Document} document Document in which to hide red links.
 * @return {void}
 */
const hideRedLinks = document => {
  const spanTemplate = newRedLinkTemplate(document)
  redLinkAnchorsInDocument(document)
    .forEach(redLink => {
      const span = spanTemplate.cloneNode(false)
      configureRedLinkTemplate(span, redLink)
      replaceAnchorWithSpan(redLink, span)
    })
}

export default {
  hideRedLinks,
  test: {
    configureRedLinkTemplate,
    redLinkAnchorsInDocument,
    newRedLinkTemplate,
    replaceAnchorWithSpan
  }
}