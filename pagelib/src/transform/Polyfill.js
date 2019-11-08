/**
 * Polyfill function that tells whether a given element matches a selector.
 * @param {!Element} el Element
 * @param {!string} selector Selector to look for
 * @return {!boolean} Whether the element matches the selector
 */
const matchesSelector = (el, selector) => {
  if (el.matches) {
    return el.matches(selector)
  }
  if (el.matchesSelector) {
    return el.matchesSelector(selector)
  }
  if (el.webkitMatchesSelector) {
    return el.webkitMatchesSelector(selector)
  }
  return false
}

/**
 * @param {!Element} element
 * @param {!string} selector
 * @return {!Array.<Element>}
 */
const querySelectorAll = (element, selector) =>
  Array.prototype.slice.call(element.querySelectorAll(selector))

// https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent#Polyfill
// Required by Android API 16 AOSP Nexus S emulator.
// eslint-disable-next-line no-undef
const CustomEvent = typeof window !== 'undefined' && window.CustomEvent
  || function(type, parameters = { bubbles: false, cancelable: false, detail: undefined }) {
    // eslint-disable-next-line no-undef
    const event = document.createEvent('CustomEvent')
    event.initCustomEvent(type, parameters.bubbles, parameters.cancelable, parameters.detail)
    return event
  }

export default {
  matchesSelector,
  querySelectorAll,
  CustomEvent
}