import assert from 'assert'
import domino from 'domino'
import fixtureIO from '../utilities/FixtureIO'
import pagelib from '../../build/wikimedia-page-library-transform'

const moveLeadIntroductionUp = pagelib.LeadIntroductionTransform.moveLeadIntroductionUp
const isParagraphEligible = pagelib.LeadIntroductionTransform.test.isParagraphEligible
const extractLeadIntroductionNodes =
  pagelib.LeadIntroductionTransform.test.extractLeadIntroductionNodes
const getEligibleParagraph =
  pagelib.LeadIntroductionTransform.test.getEligibleParagraph

describe('LeadIntroductionTransform', () => {
  describe('isParagraphEligible()', () => {
    it('accept p with lots of text', () => {
      const document = domino.createDocument(
        '<p id="p1"></p><p id="p2">This p has a bunch of stuff in it. It is so great.</p>'
      )
      const goodP = document.getElementById('p2')
      assert.equal(isParagraphEligible(goodP), true)
    })
    it('reject p with no text', () => {
      const document = domino.createDocument(
        '<p id="p1"></p><p id="p2">This p has a bunch of stuff in it. It is so great.</p>'
      )
      const emptyP = document.getElementById('p1')
      assert.equal(isParagraphEligible(emptyP), false)
    })
    it('reject p with only coordinates', () => {
      const document = domino.createDocument(`
      <p id="p1">
        <span id="coordinates">
          Coordinates: 39°54′04″N 083°08′13″W / 39.90111°N 83.13694°W / 39.90111; -83.13694
        </span>
      </p>
      `)
      const pWithCoordinates = document.getElementById('p1')
      assert.equal(isParagraphEligible(pWithCoordinates), false)
    })
    it('accept p with coordinates but also lots of text', () => {
      const document = domino.createDocument(`
        <p id="p1">
          <span id="coordinates">
            Coordinates: 39°54′04″N 083°08′13″W / 39.90111°N 83.13694°W / 39.90111; -83.13694
          </span>
          This p has a bunch of stuff in it. It is so great.
        </p>
      `)
      const pWithCoordinates = document.getElementById('p1')
      assert.equal(isParagraphEligible(pWithCoordinates), true)
    })
  })
  describe('extractLeadIntroductionNodes()', () => {
    it('grabs accepted p and other elements before next p', () => {
      const document = domino.createDocument(`<p id="p1"></p><p id="p2">This p has a bunch of stuff
      in it. It is so great.</p><span id="span1">Other good stuff 1
      </span><span id="span2">Other good stuff 2</span><p id="nextP">Next P stuff</p>`)
      const goodP = document.getElementById('p2')
      const elementIDs = extractLeadIntroductionNodes(goodP).map(el => el.id)
      assert.deepEqual(elementIDs, [ 'p2', 'span1', 'span2' ])
    })
    it('grabs accepted p and nothing else if next element is a p', () => {
      const document = domino.createDocument(`<p id="p1"></p><p id="p2">This p has a bunch of stuff
      in it. It is so great.</p><p id="nextP">Next P stuff</p>`)
      const goodP = document.getElementById('p2')
      const elementIDs = extractLeadIntroductionNodes(goodP).map(el => el.id)
      assert.deepEqual(elementIDs, [ 'p2' ])
    })
    it('grabs accepted p and text node before next p', () => {
      const document = domino.createDocument(`
        <p id="p1">AAA</p><p id="p2">BBB</p>TEXT NODE TEXT<p id="nextP">DDD</p>
      `)
      const goodP = document.getElementById('p2')
      const elementIDs = extractLeadIntroductionNodes(goodP).map(el => el.textContent)
      assert.deepEqual(elementIDs, [ 'BBB', 'TEXT NODE TEXT'])
    })
  })
  describe('getEligibleParagraph()', () => {
    it('ignore p in table', () => {
      const document = domino.createDocument(`
        <div id="container">
          <table><tr><td>Table stuff bla bla
            <p id="p1"></p>
            <p id="p2">
              This p has a bunch of stuff in it. It is so great. But it's in a TABLE!
            </p>
            <p id="nextP">Next P stuff</p>
          </td></tr></table>
          <p id="p3">
            This p has a bunch of stuff in it. It is so great.
          </p>
        </div>`)
      const container = document.getElementById('container')
      const goodP = getEligibleParagraph(document, container)
      assert.equal(goodP.id, 'p3')
    })
    it('ignore p if not direct child of containerID element', () => {
      const document = domino.createDocument(`
        <div id="container">
          <span>Span stuff bla bla
            <p id="p1"></p>
            <p id="p2">
              This p has a bunch of stuff in it. It is so great.
            </p>
            <p id="nextP">Next P stuff</p>
          </span>
          <p id="p3">
            This p has a bunch of stuff in it. It is so great.
          </p>
        </div>`)
      const goodP = getEligibleParagraph(document, document.getElementById('container'))
      assert.equal(goodP.id, 'p3')
    })
    it('return nothing when only any empty p is present', () => {
      const document = domino.createDocument(`
        <div id="container">
          <span>Span stuff bla bla
            <p id="p1"></p>
          </span>
        </div>`)
      const goodP = getEligibleParagraph(document, document.getElementById('container'))
      assert.equal(goodP, undefined)
    })
    it('return nothing container is not present', () => {
      const document = domino.createDocument(`
        <div id="containerABC">
          <p id="p2">
            This p has a bunch of stuff in it. It is so great.
          </p>
        </div>`)
      const goodP = getEligibleParagraph(document, document.getElementById('container'))
      assert.equal(goodP, undefined)
    })
  })
  describe('moveLeadIntroductionUp()', () => {

    // eslint-disable-next-line require-jsdoc
    const getChildTagNames = element => Array.from(element.children).map(el => el.tagName)

    it('paragraph is relocated', () => {
      const document = fixtureIO.documentFromFixtureFile('FirstParagraphRelocation-Obama.html')
      const element = document.getElementById('content-block-0')
      const soughtP = document.querySelector('#content-block-0 > p:nth-of-type(1)')
      // Before: [ 'HR', 'DIV', 'TABLE', 'P', 'P', 'P', 'P', 'DIV' ]
      moveLeadIntroductionUp(document, element, null)
      assert.deepEqual(
        getChildTagNames(document.getElementById('content-block-0')),
        [ 'P', 'HR', 'DIV', 'TABLE', 'P', 'P', 'P', 'DIV' ]
      )
      const movedP = document.querySelector('#content-block-0 > p:nth-of-type(1)')
      assert.deepEqual(soughtP, movedP)
    })
    it('related UL elements are relocated', () => {
      const document = fixtureIO.documentFromFixtureFile('FirstParagraphRelocation-Planet.html')
      const element = document.getElementById('content-block-0')
      const soughtP = document.querySelector('#content-block-0 > p:nth-of-type(1)')
      // Before: [ 'HR', 'DIV', 'TABLE', 'P', 'UL', 'P', 'P', 'P', 'P', 'P' ]
      moveLeadIntroductionUp(document, element, null)
      assert.deepEqual(
        getChildTagNames(document.getElementById('content-block-0')),
        [ 'P', 'UL', 'HR', 'DIV', 'TABLE', 'P', 'P', 'P', 'P', 'P' ]
      )
      const movedP = document.querySelector('#content-block-0 > p:nth-of-type(1)')
      assert.deepEqual(soughtP, movedP)
    })
    it('coordinates ignored, 1st paragraph relocated', () => {
      const document = fixtureIO.documentFromFixtureFile('FirstParagraphRelocation-Sharya.html')
      const element = document.getElementById('content-block-0')
      const soughtP = document.querySelector('#content-block-0 > p:nth-of-type(1)')
      // Before: [ 'HR', 'TABLE', 'P', 'P' ]
      moveLeadIntroductionUp(document, element, null)
      assert.deepEqual(
        getChildTagNames(document.getElementById('content-block-0')),
        [ 'P', 'HR', 'TABLE', 'P' ]
      )
      const movedP = document.querySelector('#content-block-0 > p:nth-of-type(1)')
      assert.deepEqual(soughtP, movedP)
    })
    it('coordinates ignored, 2nd paragraph relocated', () => {
      const document = fixtureIO.documentFromFixtureFile('FirstParagraphRelocation-Bolton.html')
      const element = document.getElementById('content-block-0')
      const soughtP = document.querySelector('#content-block-0 > p:nth-of-type(2)')
      // Before: [ 'HR', 'P', 'TABLE', 'P', 'P', 'P' ]
      moveLeadIntroductionUp(document, element, null)
      assert.deepEqual(
        getChildTagNames(document.getElementById('content-block-0')),
        [ 'P', 'HR', 'P', 'TABLE', 'P', 'P' ]
      )
      const movedP = document.querySelector('#content-block-0 > p:nth-of-type(1)')
      assert.deepEqual(soughtP, movedP)
    })
  })
})