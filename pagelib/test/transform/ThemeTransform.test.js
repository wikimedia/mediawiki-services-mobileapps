import assert from 'assert'
import domino from 'domino'
import pagelib from '../../build/wikimedia-page-library-transform'

describe('ThemeTransform', () => {
  describe('.setTheme()', () => {
    it('set', () => {
      const document = domino.createDocument()
      const light = pagelib.ThemeTransform.THEME.DEFAULT
      pagelib.ThemeTransform.setTheme(document, light)
      assert.ok(document.body.classList.contains(light))
    })

    it('replace', () => {
      const document = domino.createDocument()

      const light = pagelib.ThemeTransform.THEME.DEFAULT
      pagelib.ThemeTransform.setTheme(document, light)

      const dark = pagelib.ThemeTransform.THEME.DARK
      pagelib.ThemeTransform.setTheme(document, pagelib.ThemeTransform.THEME.DARK)

      assert.ok(!document.body.classList.contains(light))
      assert.ok(document.body.classList.contains(dark))
    })
  })
})