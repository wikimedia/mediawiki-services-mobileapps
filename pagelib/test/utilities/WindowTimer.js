/**
 * Mocks the time keeping portion of Window and WindowOrWorkerGlobalScope. Domino does not provide
 * this functionality.
 */
export default class {
  /** */
  constructor() {
    this._timeout = undefined
    this._delay = 0
    this._sets = 0
    this._clears = 0
  }

  /**
   * Timeout function.
   *
   * @callback TimeoutFunction
   */

  /** @return {?TimeoutFunction} The timeout function set by setTimeout(). */
  get timeout() { return this._timeout }

  /** @return {!number} The delay set by setTimeout(). */
  get delay() { return this._delay }

  /** @return {!number} The nonnegative number of times setTimeout() was invoked. */
  get sets() { return this._sets }

  /** @return {!number} The nonnegative number of times clearTimeout() was invoked. */
  get clears() { return this._clears }

  /**
   * @param {!TimeoutFunction} timeout
   * @param {!number} delay
   * @return {!number} A nonnegative timeout identifier.
   */
  setTimeout(timeout, delay) {
    this._timeout = timeout
    this._delay = delay
    this._sets += 1
    return this.sets
  }

  /** @return {void} */
  clearTimeout() { this._clears += 1 }
}