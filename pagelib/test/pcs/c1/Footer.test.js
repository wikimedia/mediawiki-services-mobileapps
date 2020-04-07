import assert from 'assert'
import Banana from 'banana-i18n'
import pcs from '../../../build/wikimedia-page-library-pcs'

describe('pcs.c1.Footer', () => {
  describe('.getPageLastEditedString() - English plural message has 0 case last (correct order)', () => {
    let banana

    before(() => {
      banana = new Banana('en')
      // wrong order: {{PLURAL:$1|0=Updated today|1=Updated yesterday|Updated $1 days ago}}
      banana.load({ 'page-last-edited' : '{{PLURAL:$1|Updated yesterday|Updated $1 days ago|0=Updated today}}' })
    })

    it('today', () => {
      assert.strictEqual(pcs.c1.Footer._getPageLastEditedString(banana, 0), 'Updated today')
    })

    it('yesterday', () => {
      assert.strictEqual(pcs.c1.Footer._getPageLastEditedString(banana, 1), 'Updated yesterday')
    })

    it('2 days ago', () => {
      assert.strictEqual(pcs.c1.Footer._getPageLastEditedString(banana, 2), 'Updated 2 days ago')
    })
  })

  describe('.getPageLastEditedString() - German plural message has 0 case first (wrong order)', () => {
    let banana

    before(() => {
      banana = new Banana('de')
      banana.load({ 'page-last-edited': '{{PLURAL:$1|0=Heute|1=Gestern|Vor $1 Tagen}} bearbeitet' })
    })

    it('today', () => {
      assert.strictEqual(pcs.c1.Footer._getPageLastEditedString(banana, 0), 'Heute bearbeitet')
    })

    it('yesterday', () => {
      assert.strictEqual(pcs.c1.Footer._getPageLastEditedString(banana, 1), 'Gestern bearbeitet')
    })

    it('2 days ago', () => {
      assert.strictEqual(pcs.c1.Footer._getPageLastEditedString(banana, 2), '')
    })
  })
})