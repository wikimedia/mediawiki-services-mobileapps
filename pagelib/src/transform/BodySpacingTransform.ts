interface Spacing {
  top?: string
  right?: string
  bottom?: string
  left?: string
}

/**
 * Sets the margins on an element via inline styles.
 * @param {!HTMLBodyElement} bodyElement the element that needs the margins adjusted.
 *   For the apps this is usually the body element.
 * @param {Spacing} values { top, right, bottom, left }
 *   Use value strings with units, e.g. '16px'. Undefined values are ignored.
 * @return {void}
 */
const setMargins = (bodyElement: HTMLBodyElement, values: Spacing): void => {
  if (values.top !== undefined) {
    bodyElement.style.marginTop = values.top
  }
  if (values.right !== undefined) {
    bodyElement.style.marginRight = values.right
  }
  if (values.bottom !== undefined) {
    bodyElement.style.marginBottom = values.bottom
  }
  if (values.left !== undefined) {
    bodyElement.style.marginLeft = values.left
  }
}

/**
 * Sets padding on an element via inline styles.
 * @param {!HTMLBodyElement} bodyElement the element that needs the padding adjusted.
 *   For the apps this is usually the body element.
 * @param {Spacing} values { top, right, bottom, left }
 *   Use value strings with units, e.g. '16px'. Undefined values are ignored.
 * @return {void}
 */
const setPadding = (bodyElement: HTMLBodyElement, values: Spacing): void => {
  if (values.top !== undefined) {
    bodyElement.style.paddingTop = values.top
  }
  if (values.right !== undefined) {
    bodyElement.style.paddingRight = values.right
  }
  if (values.bottom !== undefined) {
    bodyElement.style.paddingBottom = values.bottom
  }
  if (values.left !== undefined) {
    bodyElement.style.paddingLeft = values.left
  }
}

export default {
  setMargins,
  setPadding
}