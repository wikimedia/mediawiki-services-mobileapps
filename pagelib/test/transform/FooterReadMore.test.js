import assert from 'assert'
import pagelib from '../../build/wikimedia-page-library-transform'

describe('FooterReadMore', () => {
  describe('safelyRemoveEnclosures()', () => {
    const safelyRemoveEnclosures = pagelib.FooterReadMore.test.safelyRemoveEnclosures
    it('should remove forward slash enclosures', () => {
      assert.ok(safelyRemoveEnclosures('abc/123/def a/b/c', '/', '/') === 'abcdef ac')
    })

    it('should remove parenthetical enclosures', () => {
      assert.ok(safelyRemoveEnclosures('abc(123)def a(b)c', '(', ')') === 'abcdef ac')
    })

    it('should coalesce spaces on either side of enclosure', () => {
      assert.ok(safelyRemoveEnclosures('abc (123) def a(b)c', '(', ')') === 'abc def ac')
    })
  })
  describe('cleanExtract()', () => {
    const cleanExtract = pagelib.FooterReadMore.test.cleanExtract
    it('should clean complex extract', () => {
      const input =
      'Lutefisk (Norwegian) or lutfisk (Swedish) (pronounced [lʉːtfesk] in Northern and Central ' +
      'Norway, [lʉːtəfisk] in Southern Norway, [lʉːtfɪsk] in Sweden and in Finland (Finnish: ' +
      'lipeäkala)) is a traditional dish of some Nordic countries.'
      const expectation =
      'Lutefisk or lutfisk is a traditional dish of some Nordic countries.'
      assert.ok(cleanExtract(input) === expectation)
    })
  })
})