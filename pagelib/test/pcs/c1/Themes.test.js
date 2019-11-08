import assert from 'assert'
import { c1 } from '../../../build/wikimedia-page-library-pcs'

const Themes = c1.Themes

describe('pcs.c1.Themes', () => {
  it('presence', () => {
    assert.ok(Themes.DEFAULT)
    assert.ok(Themes.DARK)
    assert.ok(Themes.BLACK)
    assert.ok(Themes.SEPIA)
  })
})