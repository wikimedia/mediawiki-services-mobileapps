import assert from 'assert'
import { c1 } from '../../../build/wikimedia-page-library-pcs'
import domino from 'domino'

const Page = c1.Page
const Themes = c1.Themes

/* eslint-disable no-global-assign, no-native-reassign */
describe('pcs.c1.Page', () => {
  const emptyHTML = '<html lang="en"><head><title>Foo</title></head><body><p></p></body></html>'

  describe('.setup()', () => {
    it('all', () => {
      let onSuccessCallbackCalled = false
      window = domino.createWindow(
        '<strong class="pcs-table-infobox">Quick facts</strong>')
      document = window.document

      Page.setup({
        platform: 'ios',
        clientVersion: '6.2.1',
        theme: 'dark',
        dimImages: true,
        margins: { top: '1px', right: '2px', bottom: '3px', left: '4px' },
        areTablesInitiallyExpanded: true,
        textSizeAdjustmentPercentage: '100%',
        scrollTop: 64,
        loadImages: true
      }, () => { onSuccessCallbackCalled = true })

      assert.ok(document.body.classList.contains('pcs-theme-dark'))
      assert.ok(document.body.classList.contains('pcs-dim-images'))
      assert.strictEqual(document.body.style.marginTop, '1px')
      assert.strictEqual(document.body.style.marginRight, '2px')
      assert.strictEqual(document.body.style.marginBottom, '3px')
      assert.strictEqual(document.body.style.marginLeft, '4px')
      assert.strictEqual(document.body.style['font-size'], '95%')
      // assert.strictEqual(document.body.style['text-size-adjust'], '100%')
      assert.strictEqual(Page.testing.getScroller().testing.getScrollTop(), 64)
      assert.ok(onSuccessCallbackCalled)
    })
  })

  describe('.setTheme()', () => {
    it('sepia', () => {
      document = domino.createDocument(emptyHTML)
      Page.setTheme(Themes.SEPIA)
      assert.ok(document.body.classList.contains(Themes.SEPIA))
    })
  })

  describe('.setDimImages()', () => {
    it('true + callback', () => {
      window = domino.createWindow(emptyHTML)
      document = window.document

      Page.setDimImages(true)

      assert.ok(document.body.classList.contains('pcs-dim-images'))
    })

    it('false', () => {
      window = domino.createWindow(emptyHTML)
      document = window.document

      Page.setDimImages(false)

      assert.ok(!document.body.classList.contains('pcs-dim-images'))
    })
  })

  describe('.setMargins()', () => {
    it('all', () => {
      window = domino.createWindow(emptyHTML)
      document = window.document

      Page.setMargins({ top: '1px', right: '2px', bottom: '3px', left: '4px' })

      assert.strictEqual(document.body.style.marginTop, '1px')
      assert.strictEqual(document.body.style.marginRight, '2px')
      assert.strictEqual(document.body.style.marginBottom, '3px')
      assert.strictEqual(document.body.style.marginLeft, '4px')
    })

    it('nothing', () => {
      window = domino.createWindow(emptyHTML)
      document = window.document

      Page.setMargins({})

      assert.strictEqual(document.body.style.marginTop, '')
      assert.strictEqual(document.body.style.marginRight, '')
      assert.strictEqual(document.body.style.marginBottom, '')
      assert.strictEqual(document.body.style.marginLeft, '')
    })
  })

  describe('.setTextSizeAdjustmentPercentage()', () => {
    it('120%', () => {
      window = domino.createWindow(emptyHTML)
      document = window.document

      Page.setTextSizeAdjustmentPercentage('100%')

      assert.strictEqual(document.body.style['font-size'], '95%')
      // assert.strictEqual(document.body.style['text-size-adjust'], '100%')
    })
  })

  describe('.setScrollTop()', () => {
    it('all', () => {
      window = domino.createWindow(emptyHTML)
      document = window.document

      Page.setScrollTop(64)

      assert.strictEqual(Page.testing.getScroller().testing.getScrollTop(), 64)
    })
  })

  describe('.setEditButtons()', () => {
    it('simple', () => {
      window = domino.createWindow(
        '<html about="http://en.wikipedia.org/wiki/Special:Redirect/revision/907165344">')
      document = window.document

      Page.setEditButtons(false, true)

      assert.ok(document.documentElement.classList.contains('no-editing'))
      assert.ok(document.documentElement.classList.contains('page-protected'))
    })
  })

  describe('.getRevision()', () => {
    it('all', () => {
      window = domino.createWindow(
        '<html about="http://en.wikipedia.org/wiki/Special:Redirect/revision/907165344">')
      document = window.document

      assert.strictEqual(Page.getRevision(), '907165344')
    })
  })

  describe('.getTableOfContents()', () => {
    it('all', () => {
      window = domino.createWindow(`
        <section data-mw-section-id="0">Foo</section>
        <section data-mw-section-id="1" id="Foo"><div><h2 id="Foo">Foo</h2></div></section>
        <section data-mw-section-id="2" id="Foo"><div><h3 id="Foo">Foo</h3></div></section>
        <section data-mw-section-id="-1" id="Foo"><div><h5 id="Foo">Foo</h5></div></section>
        <section data-mw-section-id="3" id="Foo"><div><h4 id="Foo">Foo</h4></div></section>
        <section data-mw-section-id="4" id="Foo"><div><h3 id="Foo">Foo</h3></div></section>
        <section data-mw-section-id="-2" id="Foo"><div><h5 id="Foo">Foo</h5></div></section>
        <section data-mw-section-id="5" id="Foo"><div><h4 id="Foo">Foo</h4></div></section>
        <section data-mw-section-id="6" id="Foo"><div><h3 id="Foo">Foo</h3></div></section>
        <section data-mw-section-id="7" id="Foo"><div><h2 id="Foo">Foo</h2></div></section>
      `)
      document = window.document

      const result = Page.getTableOfContents()
      const expectedNumbers = ['1', '1.1', '1.1.1', '1.2', '1.2.1', '1.3', '2']
      assert.strictEqual(result.length, 7, 'result should have 7 entries (3 excluded)')
      assert.strictEqual(result.length, expectedNumbers.length)
      result.forEach((tocSection, idx) => {
        assert.ok(tocSection.level, 'level should be present')
        assert.ok(tocSection.id, 'id should be present')
        assert.strictEqual(tocSection.number, expectedNumbers[idx], 'should have correct number')
        assert.ok(tocSection.anchor, 'anchor should be present')
        assert.ok(tocSection.title, 'title should be present')
      })
    })
  })
})