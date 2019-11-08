import CollapseTable from './CollapseTable'
import ElementUtilities from './ElementUtilities'
import LazyLoadTransform from './LazyLoadTransform'
import Polyfill from './Polyfill'
import Throttle from './Throttle'

const EVENT_TYPES = ['scroll', 'resize', CollapseTable.SECTION_TOGGLED_EVENT_TYPE]
const THROTTLE_PERIOD_MILLISECONDS = 100

/**
 * This class subscribes to key page events, applying lazy load transforms or inversions as
 * applicable. It has external dependencies on the section-toggled custom event and the following
 * standard browser events: resize, scroll.
 */
export default class {
  /**
   * @param {!Window} window
   * @param {!number} loadDistanceMultiplier Images within this multiple of the screen height are
   *                                         loaded in either direction.
   */
  constructor(window, loadDistanceMultiplier) {
    this._window = window
    this._loadDistanceMultiplier = loadDistanceMultiplier

    this._placeholders = []
    this._registered = false
    this._throttledLoadPlaceholders = Throttle.wrap(window, THROTTLE_PERIOD_MILLISECONDS,
      () => this._loadPlaceholders())
  }

  /**
   * Convert images with placeholders. Calling this function may register this instance to listen to
   * page events.
   * @param {!Element} element
   * @return {void}
   */
  convertImagesToPlaceholders(element) {
    const images = LazyLoadTransform.queryLazyLoadableImages(element)
    const placeholders = LazyLoadTransform.convertImagesToPlaceholders(this._window.document,
      images)
    this._placeholders = this._placeholders.concat(placeholders)
    this._register()
  }

  /**
   * Searches for existing placeholders in the DOM Document.
   * This is an alternative to #convertImagesToPlaceholders if that was already done server-side.
   * @param {!Element} element root element to start searching for placeholders
   * @return {void}
   */
  collectExistingPlaceholders(element) {
    const placeholders
      = Polyfill.querySelectorAll(element, `.${LazyLoadTransform.PLACEHOLDER_CLASS}`)
    this._placeholders = this._placeholders.concat(placeholders)
    this._register()
  }

  /**
   * Manually trigger a load images check. Calling this function may deregister this instance from
   * listening to page events.
   * @return {void}
   */
  loadPlaceholders() { this._throttledLoadPlaceholders() }

  /**
   * This method may be safely called even when already unregistered. This function clears the
   * record of placeholders.
   * @return {void}
   */
  deregister() {
    if (!this._registered) { return }

    EVENT_TYPES.forEach(eventType =>
      this._window.removeEventListener(eventType, this._throttledLoadPlaceholders))
    this._throttledLoadPlaceholders.reset()

    this._placeholders = []
    this._registered = false
  }

  /**
   * This method may be safely called even when already registered.
   * @return {void}
   */
  _register() {
    if (this._registered || !this._placeholders.length) { return }
    this._registered = true

    EVENT_TYPES.forEach(eventType =>
      this._window.addEventListener(eventType, this._throttledLoadPlaceholders))
  }

  /** @return {void} */
  _loadPlaceholders() {
    this._placeholders = this._placeholders.filter(placeholder => {
      let pending = true
      if (this._isPlaceholderEligibleToLoad(placeholder)) {
        LazyLoadTransform.loadPlaceholder(this._window.document, placeholder)
        pending = false
      }
      return pending
    })

    if (this._placeholders.length === 0) {
      this.deregister()
    }
  }

  /**
   * @param {!HTMLSpanElement} placeholder
   * @return {!boolean}
   */
  _isPlaceholderEligibleToLoad(placeholder) {
    return ElementUtilities.isVisible(placeholder)
      && this._isPlaceholderWithinLoadDistance(placeholder)
  }

  /**
   * @param {!HTMLSpanElement} placeholder
   * @return {!boolean}
   */
  _isPlaceholderWithinLoadDistance(placeholder) {
    const bounds = placeholder.getBoundingClientRect()
    const range = this._window.innerHeight * this._loadDistanceMultiplier
    return !(bounds.top > range || bounds.bottom < -range)
  }
}