import Polyfill from './Polyfill'

/**
 * Extracts array of page issues from element
 * @param {!Document} document
 * @return {!Array.<string>} Return empty array if nothing is extracted
 */
const collectPageIssueElements = document => {
  if (!document) {
    return []
  }
  return Polyfill.querySelectorAll(document, '.mbox-text-span').map(element => {
    Polyfill.querySelectorAll(element, '.hide-when-compact, .collapsed').forEach(el => el.remove())
    return element
  })
}

/**
 * Returns section JSON for an element
 * @param {!Element} element
 * @return {!map} section info
 */
const sectionJSON = element => {
  const section = element.closest('section[data-mw-section-id]')
  const headerEl = section && section.querySelector('h1,h2,h3,h4,h5,h6')
  return {
    id: section && parseInt(section.getAttribute('data-mw-section-id'), 10),
    title: headerEl && headerEl.innerHTML.trim(),
    anchor: headerEl && headerEl.getAttribute('id')
  }
}

/**
 * Extracts array of page issues from element
 * @param {!Document} document
 * @return {!Array.<Object>} Return empty array if nothing is extracted
 */
const collectPageIssues = document => collectPageIssueElements(document).map(el => ({
  html: el.innerHTML.trim(),
  section: sectionJSON(el)
}))

/**
 * Extracts array of hatnotes from an element
 * @param {?Element} element
 * @return {!Array.<Object>} Return empty array if nothing is extracted
 */
const collectHatnotes = element => {
  if (!element) {
    return []
  }
  return Polyfill.querySelectorAll(element, 'div.hatnote').map(element => {
    const titles = Polyfill
      .querySelectorAll(element, 'div.hatnote a[href]:not([href=""]):not([redlink="1"])')
      .map(el => el.href)
    return {
      html: element.innerHTML.trim(),
      links: titles,
      section: sectionJSON(element)
    }
  })
}

export default {
  collectHatnotes,
  collectPageIssues,
  test: {
    collectPageIssueElements
  }
}