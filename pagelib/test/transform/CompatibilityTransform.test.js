import assert from 'assert'
import domino from 'domino'
import pagelib from '../../build/wikimedia-page-library-transform'

describe('CompatibilityTransform', () => {
  it('.enableSupport()', () => {
    const document = domino.createDocument()
    pagelib.CompatibilityTransform.enableSupport(document)
    for (const value of Object.values(pagelib.CompatibilityTransform.COMPATIBILITY)) {
      assert.ok(!document.documentElement.classList.contains(value), value)
    }
  })
})