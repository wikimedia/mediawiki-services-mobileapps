import assert from 'assert'
import domino from 'domino'
import pagelib from '../../build/wikimedia-page-library-transform'

describe('DimImagesTransform', () => {
  describe('.dimImages()', () => {
    it('true', () => {
      const document = domino.createDocument('')
      pagelib.DimImagesTransform.dimImages(document, true)
      const classes = document.body.classList
      assert.ok(classes.contains(pagelib.DimImagesTransform.CLASS))
      assert.strictEqual(classes.length, 1)
    })

    it('false', () => {
      const document = domino.createDocument('')
      pagelib.DimImagesTransform.dimImages(document, false)
      const classes = document.body.classList
      assert.strictEqual(classes.length, 0)
    })
  })

  describe('.dim()', () => {
    it('true', () => {
      const window = domino.createWindow()
      const document = window.document
      pagelib.DimImagesTransform.dim(window, true)
      const classes = document.body.classList
      assert.ok(classes.contains(pagelib.DimImagesTransform.CLASS))
      assert.strictEqual(classes.length, 1)
    })

    it('false', () => {
      const window = domino.createWindow()
      const document = window.document
      pagelib.DimImagesTransform.dim(window, false)
      const classes = document.body.classList
      assert.strictEqual(classes.length, 0)
    })
  })
})