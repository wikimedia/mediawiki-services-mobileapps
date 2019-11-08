import assert from 'assert'
import { c1 } from '../../../build/wikimedia-page-library-pcs'
import domino from 'domino'

const L10N = c1.L10N

/* eslint-disable no-global-assign, no-native-reassign */

describe('pcs.c1.L10N', () => {
  describe('.localizeLabels()', () => {
    it('addTitleDescription', () => {
      document = domino.createDocument(
        '<p id="pcs-edit-section-add-title-description">before</p>')

      L10N.localizeLabels({ addTitleDescription: 'addTitleDescription' })
      assert.strictEqual(document.body.querySelector('p').innerHTML, 'addTitleDescription')
    })
    it('tableInfobox', () => {
      document = domino.createDocument(
        '<strong class="pcs-table-infobox">Quick facts</strong>')

      L10N.localizeLabels({ tableInfobox: 'tableInfobox' })
      assert.strictEqual(document.body.querySelector('strong').innerHTML, 'tableInfobox')
    })
    it('tableOther', () => {
      document = domino.createDocument(
        '<strong class="pcs-table-other">More information</strong>')

      L10N.localizeLabels({ tableOther: 'tableOther' })
      assert.strictEqual(document.body.querySelector('strong').innerHTML, 'tableOther')
    })
    it('tableClose', () => {
      document = domino.createDocument(
        '<div class="pcs-collapse-table-collapsed-bottom">Close</div>')

      L10N.localizeLabels({ tableClose: 'tableClose' })
      assert.strictEqual(document.body.querySelector('div').innerHTML, 'tableClose')
    })
  })
})