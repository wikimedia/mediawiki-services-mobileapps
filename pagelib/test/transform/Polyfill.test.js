import assert from 'assert'
import pagelib from '../../build/wikimedia-page-library-transform'

const Polyfill = pagelib.test.Polyfill

describe('Polyfill', () => {
  describe('.matchesSelector()', () => {
    it('.matches()', () => {
      const element = { matches: () => true }
      assert.ok(Polyfill.matchesSelector(element, 'html'))
    })

    it('.matchesSelector()', () => {
      const element = { matchesSelector: () => true }
      assert.ok(Polyfill.matchesSelector(element, 'html'))
    })

    it('.webkitMatchesSelector()', () => {
      const element = { webkitMatchesSelector: () => true }
      assert.ok(Polyfill.matchesSelector(element, 'html'))
    })

    it('unsupported', () => {
      const element = {}
      assert.ok(!Polyfill.matchesSelector(element, 'html'))
    })
  })

  describe('.CustomEvent', function Test() {
    beforeEach(() => {
      this.subject = new Polyfill.CustomEvent('type',
        { bubbles: 'bubbles', cancelable: 'cancelable', detail: 'detail' })
    })

    it('.type', () => assert.ok(this.subject.type === 'type'))
    it('.bubbles', () => assert.ok(this.subject.bubbles === 'bubbles'))
    it('.cancelable', () => assert.ok(this.subject.cancelable === 'cancelable'))
    it('.detail', () => assert.ok(this.subject.detail === 'detail'))
  })
})