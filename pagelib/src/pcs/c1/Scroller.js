let scrollTop = 0

/**
 * Sets the maximum top scroll position in pixel. Use this to adjust for any decor overlaying the
 * Viewport.
 * @param {!number} newValue pixel value
 * @return {void}
 */
const setScrollTop = newValue => {
  scrollTop = newValue
}

/**
 * Gets maximum top scroll position in pixel.
 * @return {number}
 */
const getScrollTop = () => scrollTop

/**
 * Scrolls the WebView to the top of the container parent node.
 * Can be used as FooterDivClickCallback
 * @param {!Element} container
 * @return {void}
 */
const scrollWithDecorOffset = container => {
  window.scrollTo(0, container.parentNode.offsetTop - scrollTop)
}

export default {
  setScrollTop,
  scrollWithDecorOffset,
  testing: {
    getScrollTop
  }
}