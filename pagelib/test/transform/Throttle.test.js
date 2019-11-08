import WindowTimer from '../utilities/WindowTimer'
import assert from 'assert'
import pagelib from '../../build/wikimedia-page-library-transform'

describe('Throttle', function Test() {
  const Throttle = pagelib.test.Throttle

  beforeEach(() => {
    this.window = new WindowTimer()
    this.sample = 0
    this.throttled = Throttle.wrap(this.window, Number.POSITIVE_INFINITY, value => {
      this.sample += value
      return this.sample
    })
  })

  describe('when canceled', () => {
    beforeEach(() => this.throttled.cancel())

    it('no timeout is cleared', () => assert.ok(!this.window.clears))

    it('there are no pending invocations', () => assert.ok(!this.throttled.pending()))
  })

  describe('when reset', () => {
    beforeEach(() => this.throttled.reset())

    it('no timeout is cleared', () => assert.ok(!this.window.clears))

    it('there is no prior result', () => assert.ok(!this.throttled.result()))
    it('the next invocation is eligible', () => assert.ok(!this.throttled.delay()))
  })

  describe('when invoked', () => {
    beforeEach(() => this.throttled(1))
    afterEach(() => this.throttled.cancel())

    it('the timeout is queued', () => assert.ok(this.window.sets === 1))
    it('the next invocation was not delayed', () => assert.ok(!this.window.delay))

    it('there is no prior result', () => assert.ok(!this.throttled.result()))
    it('the next invocation is pending', () => assert.ok(this.throttled.pending()))
    it('the next invocation is not delayed', () => assert.ok(!this.throttled.delay()))

    it('the function was not executed', () => assert.ok(this.sample === 0))

    describe('and canceled', () => {
      beforeEach(() => this.throttled.cancel())

      it('the timeout is cleared', () => assert.ok(this.window.clears === 1))

      it('there are no pending invocations', () => assert.ok(!this.throttled.pending()))
    })

    describe('and reset', () => {
      beforeEach(() => this.throttled.reset())

      it('the timeout is cleared', () => assert.ok(this.window.clears === 1))

      it('there is no prior result', () => assert.ok(!this.throttled.result()))
      it('the next invocation is eligible', () => assert.ok(!this.throttled.delay()))
    })

    describe('and executed', () => {
      beforeEach(() => this.window.timeout())

      it('the prior result is updated', () => assert.ok(this.throttled.result() === 1))
      it('the next invocation is not pending', () => assert.ok(!this.throttled.pending()))
      it('the next invocation is delayed', () => assert.ok(this.throttled.delay()))

      it('the function was executed', () => assert.ok(this.sample === 1))

      describe('and canceled', () => {
        beforeEach(() => this.throttled.cancel())

        it('no timeout is cleared', () => assert.ok(!this.window.clears))

        it('there are no pending invocations', () => assert.ok(!this.throttled.pending()))
      })

      describe('and reset', () => {
        beforeEach(() => this.throttled.reset())

        it('no timeout is cleared', () => assert.ok(!this.window.clears))

        it('there is no prior result', () => assert.ok(!this.throttled.result()))
        it('the next invocation is eligible', () => assert.ok(!this.throttled.delay()))
      })

      describe('and invoked again', () => {
        beforeEach(() => this.throttled(2))

        it('the timeout is queued', () => assert.ok(this.window.sets === 2))
        it('the next invocation is delayed', () => assert.ok(this.window.delay))

        it('the prior result is unchanged', () => assert.ok(this.throttled.result() === 1))
        it('the next invocation is pending', () => assert.ok(this.throttled.pending()))
        it('the next invocation is delayed', () => assert.ok(this.throttled.delay()))

        it('the function was not executed', () => assert.ok(this.sample === 1))

        describe('and executed again', () => {
          beforeEach(() => this.window.timeout())

          it('the prior result is updated', () => assert.ok(this.throttled.result() === 3))
          it('the next invocation is not pending', () => assert.ok(!this.throttled.pending()))
          it('the next invocation is delayed', () => assert.ok(this.throttled.delay()))

          it('the function was executed', () => assert.ok(this.sample === 3))
        })
      })
    })

    describe('and invoked again', () => {
      beforeEach(() => this.throttled(2))

      it('the timeout is not queued', () => assert.ok(this.window.sets === 1))
      it('the next invocation was not delayed', () => assert.ok(!this.window.delay))

      it('there is no prior result', () => assert.ok(!this.throttled.result()))
      it('the next invocation is pending', () => assert.ok(this.throttled.pending()))
      it('the next invocation is not delayed', () => assert.ok(!this.throttled.delay()))

      it('the function was not executed', () => assert.ok(this.sample === 0))

      describe('and executed', () => {
        beforeEach(() => this.window.timeout())

        it('the prior result is updated', () => assert.ok(this.throttled.result() === 2))
        it('the next invocation is not pending', () => assert.ok(!this.throttled.pending()))
        it('the next invocation is delayed', () => assert.ok(this.throttled.delay()))

        it('the function was executed', () => assert.ok(this.sample === 2))
      })
    })
  })
})