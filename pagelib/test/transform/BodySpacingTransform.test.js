import { BodySpacingTransform } from '../../build/wikimedia-page-library-transform'
import assert from 'assert'
import domino from 'domino'

describe('BodySpacingTransform', () => {
  describe('.setMargins()', () => {
    it('no values', () => {
      const document = domino.createDocument('<p></p>')
      BodySpacingTransform.setMargins(document.body, {})
      assert.strictEqual(document.body.outerHTML, '<body><p></p></body>')
    })

    it('just left + right', () => {
      const document = domino.createDocument('<p></p>')
      BodySpacingTransform.setMargins(document.body, { right: '8px', left: '16px' })
      assert.strictEqual(document.body.style.marginRight,'8px')
      assert.strictEqual(document.body.style.marginLeft,'16px')
    })

    it('all', () => {
      const document = domino.createDocument('<p></p>')
      BodySpacingTransform.setMargins(document.body,
        { top: '1px', right: '2px', bottom: '3px', left: '4px' })
      assert.strictEqual(document.body.style.marginTop,'1px')
      assert.strictEqual(document.body.style.marginRight,'2px')
      assert.strictEqual(document.body.style.marginBottom,'3px')
      assert.strictEqual(document.body.style.marginLeft,'4px')
    })
  })

  describe('.setPadding()', () => {
    it('no values', () => {
      const document = domino.createDocument('<p></p>')
      BodySpacingTransform.setPadding(document.body, {})
      assert.strictEqual(document.body.outerHTML, '<body><p></p></body>')
    })

    it('just left + right', () => {
      const document = domino.createDocument('<p></p>')
      BodySpacingTransform.setPadding(document.body, { right: '8px', left: '16px' })
      assert.strictEqual(document.body.style.paddingRight,'8px')
      assert.strictEqual(document.body.style.paddingLeft,'16px')
    })

    it('all', () => {
      const document = domino.createDocument('<p></p>')
      BodySpacingTransform.setPadding(document.body,
        { top: '1px', right: '2px', bottom: '3px', left: '4px' })
      assert.strictEqual(document.body.style.paddingTop,'1px')
      assert.strictEqual(document.body.style.paddingRight,'2px')
      assert.strictEqual(document.body.style.paddingBottom,'3px')
      assert.strictEqual(document.body.style.paddingLeft,'4px')
    })
  })
})