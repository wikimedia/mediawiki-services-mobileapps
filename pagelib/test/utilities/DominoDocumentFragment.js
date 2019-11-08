import domino from 'domino'

/**
 * Gets a document fragment suitable for use in unit tests.
 * Details: https://github.com/fgnass/domino/issues/73#issuecomment-200466430
 * @param {?string} htmlString An HTML string.
 * @return {!domino.impl.DocumentFragment} A domino implementation of a DocumentFragment.
 */
const documentFragmentFromHTMLString = htmlString => {
  const document = domino.createDocument()
  const template = document.createElement('template')
  template.innerHTML = htmlString
  const fragment = template.content
  return fragment
}

export default {
  documentFragmentFromHTMLString
}