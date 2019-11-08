import assert from 'assert'

// These methods are useful in tests which verify changes a method makes to element 'style'
// properties.

/**
 * An object whose properties are taken to be style property names,
 * and whose property values are taken to be style property values.
 * @typedef {object} StylesHash
 */

/**
 * Sets styles on an element.
 * @param  {!HTMLElement} element   Element
 * @param  {!StylesHash}  styles    Styles to apply to 'element'
 * @return {void}
 */
const mockStylesInElement = (element, styles) => {
  for (const [key, value] of Object.entries(styles)) {
    element.style[key] = value
  }
}

/**
 * Verifies styles on an element.
 * @param  {!HTMLElement} element   Element
 * @param  {!StylesHash}  styles    Styles to verify on 'element'
 * @return {void}
 */
const verifyStylesInElement = (element, styles) => {
  for (const [key, value] of Object.entries(styles)) {
    const msg = `'${key}' was expected to be '${value}' but was '${element.style[key]}'`
    assert.ok(element.style[key] === value, msg)
  }
}

/**
 * Sets styles on each element in an array of elements.
 * @param  {!Array.<HTMLElement>} elements  Array of elements
 * @param  {!StylesHash}          styles    Styles to apply to each element in 'elements'
 * @return {void}
 */
const mockStylesInElements = (elements, styles) => {
  for (const element of elements) {
    mockStylesInElement(element, styles)
  }
}

/**
 * Verifies styles on each element in an array of elements.
 * @param  {!Array.<HTMLElement>} elements  Array of elements
 * @param  {!StylesHash}          styles    Styles to verify on each element in 'elements'
 * @return {void}
 */
const verifyStylesInElements = (elements, styles) => {
  for (const element of elements) {
    verifyStylesInElement(element, styles)
  }
}

export default {
  mockStylesInElement,
  verifyStylesInElement,
  mockStylesInElements,
  verifyStylesInElements
}