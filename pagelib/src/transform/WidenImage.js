import './WidenImage.css'

/**
 * Gets array of ancestors of element which need widening.
 * @param  {!HTMLElement} element
 * @return {!Array.<HTMLElement>} Zero length array is returned if no elements should be widened.
 */
const ancestorsToWiden = element => {
  const widenThese = []
  let el = element
  while (el.parentElement) {
    el = el.parentElement
    // No need to walk above the section.
    if (el.tagName === 'SECTION') {
      break
    }
    widenThese.push(el)
  }
  return widenThese
}

/**
 * Sets style value.
 * @param {!CSSStyleDeclaration} style
 * @param {!string} key
 * @param {*} value
 * @return {void}
 */
const updateStyleValue = (style, key, value) => {
  style[key] = value
}

/**
 * Sets style value only if value for given key already exists.
 * @param {CSSStyleDeclaration} style
 * @param {!string} key
 * @param {*} value
 * @return {void}
 */
const updateExistingStyleValue = (style, key, value) => {
  const valueExists = Boolean(style[key])
  if (valueExists) {
    updateStyleValue(style, key, value)
  }
}

/**
 * Image widening CSS key/value pairs.
 * @type {Object}
 */
const styleWideningKeysAndValues = {
  width: '100%',
  height: 'auto',
  maxWidth: '100%',
  float: 'none'
}

/**
 * Perform widening on an element. Certain style properties are updated, but only if existing values
 * for these properties already exist.
 * @param  {!HTMLElement} element
 * @return {void}
 */
const widenElementByUpdatingExistingStyles = element => {
  Object.keys(styleWideningKeysAndValues)
    .forEach(key => updateExistingStyleValue(element.style, key, styleWideningKeysAndValues[key]))
}

/**
 * Perform widening on an element.
 * @param  {!HTMLElement} element
 * @return {void}
 */
const widenElementByUpdatingStyles = element => {
  Object.keys(styleWideningKeysAndValues)
    .forEach(key => updateStyleValue(element.style, key, styleWideningKeysAndValues[key]))
}

/**
 * To widen an image element a css class called 'pcs-widen-image-override' is applied to the
 * image element, however, ancestors of the image element can prevent the widening from taking
 * effect. This method makes minimal adjustments to ancestors of the image element being widened so
 * the image widening can take effect.
 * @param  {!HTMLElement} element Element whose ancestors will be widened
 * @return {void}
 */
const widenAncestors = element => {
  ancestorsToWiden(element).forEach(widenElementByUpdatingExistingStyles)
}

/**
 * Widens the image.
 * @param  {!HTMLElement} image   The image in question
 * @return {void}
 */
const widenImage = image => {
  widenAncestors(image)
  image.classList.add('pcs-widen-image-override')
}

export default {
  widenImage,
  test: {
    ancestorsToWiden,
    updateExistingStyleValue,
    widenAncestors,
    widenElementByUpdatingExistingStyles,
    widenElementByUpdatingStyles
  }
}