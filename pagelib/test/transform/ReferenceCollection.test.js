import assert from 'assert'
import domino from 'domino'
import pagelib from '../../build/wikimedia-page-library-transform'

let document

const ReferenceCollection = pagelib.ReferenceCollection

const referenceGroupHTML = `
  <sup id='cite_ref-a' class='reference'><a id='a1' href='#cite_note-a'>[4]</a></sup>
  <sup id='cite_ref-b' class='reference'><a id='a2' href='#cite_note-b'>[6]</a></sup>
  <sup id='cite_ref-c' class='reference'><a id='a3' href='#cite_note-c'>[7]</a></sup>
  <sup id='cite_ref-d' class='reference'><a id='a4' href='#cite_note-d'>[8]</a></sup>
  <span id='cite_note-a'>0 1 2</span>
  <span id='cite_note-b'>3 4 5</span>
  <span id='cite_note-c'>6 7 8</span>
  <span id='cite_note-d'>9 10 11
    <sup id='cite_ref-d'>tick</sup>
    <a class='mw-cite-backlink'>link</a>
    <style>.mw-parser-output cite.citation{font-style:inherit}</style>
    <link rel='stylesheet' href='//foo.bar'/>
  </span>
`

const prevSiblingGetter = ReferenceCollection.test.prevSiblingGetter
const nextSiblingGetter = ReferenceCollection.test.nextSiblingGetter

describe('ReferenceCollection', () => {
  beforeEach(() => {
    document = domino.createDocument(referenceGroupHTML)
  })

  describe('.collectNearbyReferenceNodes()', () => {
    it('collects expected reference nodes', () => {
      const sourceNode = document.querySelector('#cite_ref-b')
      const nearbyRefNodes =
        ReferenceCollection.test.collectNearbyReferenceNodes(sourceNode)

      assert.deepEqual(nearbyRefNodes.map(node => node.id), [
        'cite_ref-a',
        'cite_ref-b',
        'cite_ref-c',
        'cite_ref-d'
      ])
    })
  })

  describe('.collectNearbyReferences()', () => {
    it('collects expected references group and selected index', () => {

      const MOCK_RECT = { top: 0, left: 1, right: 4, bottom: 0, width: 2, height: 3, x: 0, y: 0 }

      // Domino doesn't implement 'getBoundingClientRect' so
      // backfill it for testing methods which call it.
      domino.impl.Element.prototype.getBoundingClientRect = () => MOCK_RECT

      const secondAnchor = document.querySelector('#a2')
      const nearbyReferences = ReferenceCollection.collectNearbyReferences(document, secondAnchor)

      assert.strictEqual(nearbyReferences.selectedIndex, 1)
      assert.deepEqual(nearbyReferences.referencesGroup, [
        { href: '#cite_note-a',
          id: 'cite_ref-a',
          rect: MOCK_RECT,
          text: '[4]',
          html: '0 1 2' },
        { href: '#cite_note-b',
          id: 'cite_ref-b',
          rect: MOCK_RECT,
          text: '[6]',
          html: '3 4 5' },
        { href: '#cite_note-c',
          id: 'cite_ref-c',
          rect: MOCK_RECT,
          text: '[7]',
          html: '6 7 8' },
        { href: '#cite_note-d',
          id: 'cite_ref-d',
          rect: MOCK_RECT,
          text: '[8]',
          html: '9 10 11' }

      ])
    })
  })

  describe('.collectNearbyReferencesAsText()', () => {
    it('collects expected references group and selected index', () => {

      const MOCK_RECT = { top: 0, left: 1, width: 2, height: 3 }

      // Domino doesn't implement 'getBoundingClientRect' so
      // backfill it for testing methods which call it.
      domino.impl.Element.prototype.getBoundingClientRect = () => MOCK_RECT

      const secondAnchor = document.querySelector('#a2')
      const nearbyReferences =
        ReferenceCollection.collectNearbyReferencesAsText(document, secondAnchor)

      assert.strictEqual(nearbyReferences.selectedIndex, 1)
      assert.deepEqual(nearbyReferences.referencesGroup, [
        { href: '#cite_note-a',
          text: '[4]' },
        { href: '#cite_note-b',
          text: '[6]' },
        { href: '#cite_note-c',
          text: '[7]' },
        { href: '#cite_note-d',
          text: '[8]' }

      ])
    })
  })

  describe('.isCitation()', () => {
    const isCitation = ReferenceCollection.isCitation
    it('identifies citations', () => {
      assert.ok(isCitation('bla#cite_note') === true)
      assert.ok(isCitation('#cite_note') === true)
    })
    it('rejects non-citations', () => {
      assert.ok(isCitation('bla#nope_note') === false)
      assert.ok(isCitation('') === false)
      assert.ok(isCitation('#') === false)
    })
  })

  describe('.adjacentNonWhitespaceNode()', () => {
    const adjacentNonWhitespaceNode = ReferenceCollection.test.adjacentNonWhitespaceNode
    beforeEach(() => {
      document.documentElement.innerHTML = `
        <stuff>
          \t<b id=one>one</b>
          \t<b id=two>two</b>
          \t<b id=three>three</b>
        </stuff>`
    })
    it('gets previous non whitespace node', () => {
      assert.strictEqual(
        adjacentNonWhitespaceNode(document.querySelector('#two'), prevSiblingGetter).id, 'one'
      )
    })
    it('gets next non whitespace node', () => {
      assert.strictEqual(
        adjacentNonWhitespaceNode(document.querySelector('#two'), nextSiblingGetter).id, 'three'
      )
    })
  })
  describe('.isWhitespaceTextNode()', () => {
    const isWhitespaceTextNode = ReferenceCollection.test.isWhitespaceTextNode
    it('rejects null node', () => {
      assert.strictEqual(isWhitespaceTextNode(null), false)
    })
    it('rejects element node', () => {
      assert.strictEqual(isWhitespaceTextNode(document.createElement('DIV')), false)
    })
    it('rejects document node', () => {
      assert.strictEqual(isWhitespaceTextNode(document.implementation.createHTMLDocument()), false)
    })
    it('rejects comment node', () => {
      assert.strictEqual(isWhitespaceTextNode(document.createComment('A comment')), false)
    })
    it('rejects non whitespace text node', () => {
      assert.strictEqual(isWhitespaceTextNode(document.createTextNode('Some text')), false)
    })
    it('accepts text node of space', () => {
      assert.strictEqual(isWhitespaceTextNode(document.createTextNode(' ')), true)
    })
    it('accepts text node of spaces', () => {
      assert.strictEqual(isWhitespaceTextNode(document.createTextNode('     ')), true)
    })
    it('accepts text node of tab', () => {
      assert.strictEqual(isWhitespaceTextNode(document.createTextNode('\t')), true)
    })
    it('accepts text node of tabs', () => {
      assert.strictEqual(isWhitespaceTextNode(document.createTextNode('\t\t\t')), true)
    })
    it('accepts text node of tabs and spaces', () => {
      assert.strictEqual(isWhitespaceTextNode(document.createTextNode(' \t \t \t ')), true)
    })
  })
  describe('.collectAdjacentReferenceNodes()', () => {
    const collectAdjacentReferenceNodes = ReferenceCollection.test.collectAdjacentReferenceNodes
    let sourceNode
    let collectedNodes
    beforeEach(() => {
      sourceNode = document.querySelector('#cite_ref-b')
      collectedNodes = [sourceNode]
    })
    it('collects before', () => {
      // eslint-disable-next-line require-jsdoc
      const collectedNodesUnshifter = node => collectedNodes.unshift(node)
      collectAdjacentReferenceNodes(
        sourceNode, prevSiblingGetter, collectedNodesUnshifter
      )
      assert.deepEqual(collectedNodes.map(node => node.id), [
        'cite_ref-a',
        'cite_ref-b'
      ])
    })
    it('collects after', () => {
      // eslint-disable-next-line require-jsdoc
      const collectedNodesPusher = node => collectedNodes.push(node)
      collectAdjacentReferenceNodes(
        sourceNode, nextSiblingGetter, collectedNodesPusher
      )
      assert.deepEqual(collectedNodes.map(node => node.id), [
        'cite_ref-b',
        'cite_ref-c',
        'cite_ref-d'
      ])
    })
    it('handles text nodes', () => {
      const document = domino.createDocument('<span id=a>a</span>b<span id=c>c</span>')
      const sourceNode = document.querySelector('span')
      const collectedNodes = [sourceNode]
      // eslint-disable-next-line require-jsdoc
      const collectedNodesPusher = node => collectedNodes.push(node)
      collectAdjacentReferenceNodes(
        sourceNode, nextSiblingGetter, collectedNodesPusher
      )
      assert.deepEqual(collectedNodes.map(node => node.id), ['a'])
    })
  })
  describe('.closestReferenceClassElement()', () => {
    const closestReferenceClassElement = ReferenceCollection.test.closestReferenceClassElement
    it('if element has class "reference" return it', () => {
      document = domino.createDocument(`
        <sup id='cite_ref-a' class='reference'><a id='a1' href='#cite_note-a'>[4]</a></sup>
      `)
      const anchor = document.querySelector('#cite_ref-a')
      assert.strictEqual(closestReferenceClassElement(anchor).id, 'cite_ref-a')
    })
    it('if element does not have class "reference" return first ancestor having it', () => {
      document = domino.createDocument(`
        <sup id='aa' class='reference'>
          <sup id='cite_ref-a' class='reference'>
            <a id='a1' href='#cite_note-a'>[4]</a>
          </sup>
        </sup>
      `)
      const anchor = document.querySelector('#a1')
      assert.strictEqual(closestReferenceClassElement(anchor).id, 'cite_ref-a')
    })
    it('if neither element or it ancestor(s) have class "reference" returns null', () => {
      document = domino.createDocument(`
        <sup id='cite_ref-b'><a id='a2' href='#cite_note-b'>[6]</a></sup>
      `)
      const anchor = document.querySelector('#a2')
      assert.strictEqual(closestReferenceClassElement(anchor), null)
    })
  })
  describe('.collectRefText()', () => {
    const collectRefText = ReferenceCollection.test.collectRefText
    it('extracts expected reference text', () => {
      const referenceText = collectRefText(document, document.querySelector('#cite_ref-b'))
      assert.strictEqual(referenceText, '3 4 5')
    })
    it('removes specified elements from reference text', () => {
      const referenceText = collectRefText(document, document.querySelector('#cite_ref-d'))

      document = domino.createDocument(referenceText)

      const removalSelector = 'link, style, sup[id^=cite_ref], .mw-cite-backlink'
      const matches = document.querySelectorAll(removalSelector)

      assert.strictEqual(matches.length, 0)
    })
  })
  describe('.getRefTextContainer()', () => {
    const getRefTextContainer = ReferenceCollection.test.getRefTextContainer
    it('gets correct reference text container for tapped anchor container', () => {
      const tappedAnchorContainer = document.querySelector('#cite_ref-d')
      assert.strictEqual(getRefTextContainer(document, tappedAnchorContainer).id, 'cite_note-d')
    })
  })
  describe('.hasCitationLink()', () => {
    const hasCitationLink = ReferenceCollection.test.hasCitationLink
    beforeEach(() => {
      document = domino.createDocument(`
        <sup id='cite_ref-a' class='reference'><a id='a1' href='#cite_note-a'>[4]</a></sup>
        <sup id='cite_ref-b' class='reference'><a id='a2' href='#BLA'>[5]</a></sup>
      `)
    })
    it('correctly affirms child anchor has citation link', () => {
      const element = document.querySelector('#cite_ref-a')
      assert.strictEqual(hasCitationLink(element), true)
    })
    it('correctly affirms child anchor does not have citation link', () => {
      const element = document.querySelector('#cite_ref-b')
      assert.strictEqual(hasCitationLink(element), false)
    })
  })
})