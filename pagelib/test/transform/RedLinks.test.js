import assert from 'assert'
import domino from 'domino'
import pagelib from '../../build/wikimedia-page-library-transform'

const configureRedLinkTemplate = pagelib.RedLinks.test.configureRedLinkTemplate
const redLinkAnchorsInDocument = pagelib.RedLinks.test.redLinkAnchorsInDocument
const newRedLinkTemplate = pagelib.RedLinks.test.newRedLinkTemplate
const replaceAnchorWithSpan = pagelib.RedLinks.test.replaceAnchorWithSpan
const hideRedLinks = pagelib.RedLinks.hideRedLinks

describe('RedLinks', () => {

  describe('configureRedLinkTemplate()', () => {
    it('should prepare a span to correctly represent a anchor', () => {
      const doc = domino.createDocument()
      const span = newRedLinkTemplate(doc)

      const anchor = doc.createElement('A')
      anchor.classList.add('someClass')
      anchor.classList.add('someOtherClass')
      anchor.innerHTML = '<b>someText</b>'

      configureRedLinkTemplate(span, anchor)
      assert.ok(span.classList.contains('someClass'))
      assert.ok(span.classList.contains('someOtherClass'))
      assert.ok(span.innerHTML === anchor.innerHTML)
    })
  })

  describe('redLinkAnchorsInDocument()', () => {
    it('should find one red link in a document', () => {
      const doc = domino.createDocument('<a id="link1">1</a><a id="link2" class="new">2</a>')
      const redLinkAnchors = redLinkAnchorsInDocument(doc)
      assert.ok(redLinkAnchors.length === 1)
      assert.ok(redLinkAnchors[0].id === 'link2')
    })
  })

  describe('newRedLinkTemplate()', () => {
    it('should simply return a span element', () => {
      const doc = domino.createDocument()
      const span = newRedLinkTemplate(doc)
      assert.ok(span.tagName === 'SPAN')
    })
  })

  describe('replaceAnchorWithSpan()', () => {
    it('should replace a document anchor with a span', () => {
      // We'll swap the 'A#two' with 'SPAN#two'
      const doc = domino.createDocument('<a id="one">1</a><a id="two" class="new">2</a>')
      const elementTwoTagName = doc => doc.getElementById('two').tagName // eslint-disable-line require-jsdoc, max-len
      // #two should initially be an 'A'
      assert.ok(elementTwoTagName(doc) === 'A')

      // Here's the replacement 'SPAN#two'
      const span = doc.createElement('SPAN')
      span.id = 'two'

      // Swap!
      replaceAnchorWithSpan(doc.getElementById('two'), span)

      // Ensure the swap happened - element '#two' should now be a SPAN
      assert.ok(elementTwoTagName(doc) === 'SPAN')
    })
  })

  describe('hideRedLinks()', () => {
    it('should hide the expected red links in a document', () => {
      const doc = domino.createDocument('<a id="item1">1</a><a id="item2" class="new"><b>2</b></a>')
      hideRedLinks(doc)
      const item1 = doc.getElementById('item1')
      const item2 = doc.querySelector('.new')
      assert.ok(item1.tagName === 'A')
      assert.ok(item2.tagName === 'SPAN')
      assert.ok(item2.innerHTML === '<b>2</b>')
    })
  })
})