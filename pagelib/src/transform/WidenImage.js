import './WidenImage.less'

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
 * To widen an image element a css class called 'pcs-widen-image-override' is applied to the
 * image element, however, ancestors of the image element can prevent the widening from taking
 * effect. This method adds the 'pcs-widen-image-ancestor' class to ancestors of the image element being widened so
 * the image widening can take effect.
 * @param  {!HTMLElement} element Element whose ancestors will be widened
 * @return {void}
 */
const widenAncestors = element => {
  ancestorsToWiden(element).forEach(e => e.classList.add('pcs-widen-image-ancestor'))
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
    widenAncestors
  }
}
