import assert from 'assert'
import { c1 } from '../../../build/wikimedia-page-library-pcs'
import domino from 'domino'

const Page = c1.Page
const Platforms = c1.Platforms
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
        l10n: {
          addTitleDescription: 'Titelbeschreibung bearbeiten',
          tableInfobox: 'Schnelle Fakten',
          tableOther: 'Weitere Informationen',
          tableClose: 'Schließen'
        },
        theme: 'dark',
        dimImages: true,
        margins: { top: '1px', right: '2px', bottom: '3px', left: '4px' },
        areTablesInitiallyExpanded: true,
        textSizeAdjustmentPercentage: '100%',
        scrollTop: 64,
        loadImages: true
      }, () => { onSuccessCallbackCalled = true })

      assert.strictEqual(document.querySelector('.pcs-table-infobox').innerHTML,
        'Schnelle Fakten')
      assert.ok(document.body.classList.contains('pcs-theme-dark'))
      assert.ok(document.body.classList.contains('pcs-dim-images'))
      assert.strictEqual(document.body.style.marginTop, '1px')
      assert.strictEqual(document.body.style.marginRight, '2px')
      assert.strictEqual(document.body.style.marginBottom, '3px')
      assert.strictEqual(document.body.style.marginLeft, '4px')
      assert.strictEqual(document.body.style['text-size-adjust'], '100%')
      assert.strictEqual(Page.testing.getScroller().testing.getScrollTop(), 64)
      assert.ok(onSuccessCallbackCalled)
    })
  })

  describe('.setTheme()', () => {
    it('sepia', () => {
      let callbackCalled = false
      document = domino.createDocument(emptyHTML)
      Page.setTheme(Themes.SEPIA, () => { callbackCalled = true })
      assert.ok(document.body.classList.contains(Themes.SEPIA))
      assert.ok(callbackCalled)
    })
  })

  describe('.setDimImages()', () => {
    it('true + callback', () => {
      let callbackCalled = false
      window = domino.createWindow(emptyHTML)
      document = window.document

      Page.setDimImages(true, () => { callbackCalled = true })

      assert.ok(document.body.classList.contains('pcs-dim-images'))
      assert.ok(callbackCalled)
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
      let callbackCalled = false
      window = domino.createWindow(emptyHTML)
      document = window.document

      Page.setMargins({ top: '1px', right: '2px', bottom: '3px', left: '4px' },
        () => { callbackCalled = true })

      assert.strictEqual(document.body.style.marginTop, '1px')
      assert.strictEqual(document.body.style.marginRight, '2px')
      assert.strictEqual(document.body.style.marginBottom, '3px')
      assert.strictEqual(document.body.style.marginLeft, '4px')
      assert.ok(callbackCalled)
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
      let callbackCalled = false
      window = domino.createWindow(emptyHTML)
      document = window.document

      Page.setTextSizeAdjustmentPercentage('120%',
        () => { callbackCalled = true })

      assert.strictEqual(document.body.style['text-size-adjust'], '120%')
      assert.ok(callbackCalled)
    })
  })

  describe('.setScrollTop()', () => {
    it('all', () => {
      let callbackCalled = false
      window = domino.createWindow(emptyHTML)
      document = window.document

      Page.setScrollTop(64,
        () => { callbackCalled = true })

      assert.strictEqual(Page.testing.getScroller().testing.getScrollTop(), 64)
      assert.ok(callbackCalled)
    })
  })

  describe('.setEditButtons()', () => {
    it('simple', () =>  {
      let callbackCalled = false
      window = domino.createWindow(
        '<html about="http://en.wikipedia.org/wiki/Special:Redirect/revision/907165344">')
      document = window.document

      Page.setEditButtons(false, true, () => { callbackCalled = true })

      assert.ok(document.documentElement.classList.contains('no-editing'))
      assert.ok(document.documentElement.classList.contains('page-protected'))
      assert.ok(callbackCalled)
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
        assert.ok(tocSection.id,'id should be present')
        assert.strictEqual(tocSection.number, expectedNumbers[idx], 'should have correct number')
        assert.ok(tocSection.anchor, 'anchor should be present')
        assert.ok(tocSection.title, 'title should be present')
      })
    })
  })
})