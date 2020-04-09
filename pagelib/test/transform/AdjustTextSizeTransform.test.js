import { AdjustTextSize } from '../../build/wikimedia-page-library-transform'
import assert from 'assert'
import domino from 'domino'

describe('AdjustTextSize', () => {
  describe('.setPercentage()', () => {
    it('no values', () => {
      const document = domino.createDocument('<p></p>')
      AdjustTextSize.setPercentage(document.body)
      assert.strictEqual(document.body.outerHTML, '<body><p></p></body>')
    })

    it('set string value', () => {
      const document = domino.createDocument('<p></p>')
      AdjustTextSize.setPercentage(document.body, '80%')

      // Per note in AdjustTextSize.ts, temporary change was made. After reversion, the final two
      // lines should be uncommented and the next line should be deleted.
      assert.strictEqual(document.body.style['font-size'], '76%')
      // assert.strictEqual(document.body.style['-webkit-text-size-adjust'], '80%')
      // assert.strictEqual(document.body.style['text-size-adjust'], '80%')
    })
  })
})