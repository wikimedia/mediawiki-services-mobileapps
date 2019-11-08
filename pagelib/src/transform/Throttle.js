/** Function rate limiter. */
export default class Throttle {
  /**
   * The function to invoke when not throttled.
   *
   * @callback NotThrottledFunction
   */

  /**
   * A function wrapped in a Throttle.
   *
   * @callback WrappedFunction
   */

  /**
   * Wraps a function in a Throttle.
   * @param {!Window} window
   * @param {!number} period The nonnegative minimum number of milliseconds between function
   *                         invocations.
   * @param {!NotThrottledFunction} funktion
   * @return {!WrappedFunction}
   */
  static wrap(window, period, funktion) {
    const throttle = new Throttle(window, period, funktion)
    const throttled = function Throttled() { return throttle.queue(this, arguments) }
    throttled.result = () => throttle.result
    throttled.pending = () => throttle.pending()
    throttled.delay = () => throttle.delay()
    throttled.cancel = () => throttle.cancel()
    throttled.reset = () => throttle.reset()
    return throttled
  }

  /**
   * @param {!Window} window
   * @param {!number} period The nonnegative minimum number of milliseconds between function
   *                         invocations.
   * @param {!NotThrottledFunction} funktion
   */
  constructor(window, period, funktion) {
    this._window = window
    this._period = period
    this._function = funktion

    // The upcoming invocation's context and arguments.
    this._context = undefined
    this._arguments = undefined

    // The previous invocation's result, timeout identifier, and last run timestamp.
    this._result = undefined
    this._timeout = 0
    this._timestamp = 0
  }

  /**
   * The return value of the initial run is always undefined. The return value of subsequent runs is
   * always a previous result. The context and args used by a future invocation are always the most
   * recently supplied. Invocations, even if immediately eligible, are dispatched.
   * @param {?any} context
   * @param {?any} args The arguments passed to the underlying function.
   * @return {?any} The cached return value of the underlying function.
   */
  queue(context, args) {
    // Always update the this and arguments to the latest supplied.
    this._context = context
    this._arguments = args

    if (!this.pending()) {
      // Queue a new invocation.
      this._timeout = this._window.setTimeout(() => {
        this._timeout = 0
        this._timestamp = Date.now()
        this._result = this._function.apply(this._context, this._arguments)
      }, this.delay())
    }

    // Always return the previous result.
    return this.result
  }

  /** @return {?any} The cached return value of the underlying function. */
  get result() { return this._result }

  /** @return {!boolean} true if an invocation is queued. */
  pending() { return Boolean(this._timeout) }

  /**
   * @return {!number} The nonnegative number of milliseconds until an invocation is eligible to
   *                   run.
   */
  delay() {
    if (!this._timestamp) { return 0 }
    return Math.max(0, this._period - (Date.now() - this._timestamp))
  }

  /**
   * Clears any pending invocation but doesn't clear time last invoked or prior result.
   * @return {void}
   */
  cancel() {
    if (this._timeout) { this._window.clearTimeout(this._timeout) }
    this._timeout = 0
  }

  /**
   * Clears any pending invocation, time last invoked, and prior result.
   * @return {void}
   */
  reset() {
    this.cancel()
    this._result = undefined
    this._timestamp = 0
  }
}