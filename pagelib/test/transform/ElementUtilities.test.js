import assert from 'assert'
import domino from 'domino'
import fixtureIO from '../utilities/FixtureIO'
import pagelib from '../../build/wikimedia-page-library-transform'

const elementUtilities = pagelib.test.ElementUtilities
let document

describe('ElementUtilities', () => {
  beforeEach(() => {
    document = fixtureIO.documentFromFixtureFile('ElementUtilities.html')
  })

  describe('.findClosestAncestor()', () => {
    it('doesn\'t consider self', () => {
      const element = document.querySelector('.matching')
      const ancestor = elementUtilities.findClosestAncestor(element, '.matching')
      assert.ok(!ancestor)
    })

    it('find first div ancestor which has a certain class', () => {
      const element = document.getElementById('someImage')
      const ancestor = elementUtilities.findClosestAncestor(element, "div[class='tsingle']")
      assert.ok(ancestor.id === 'imageGreatGrandParentDiv')
    })

    it('find first div ancestor which has a certain class among many classes', () => {
      const element = document.getElementById('someImage')
      const ancestor = elementUtilities.findClosestAncestor(element, "div[class*='someClassOne']")
      assert.ok(ancestor.id === 'imageGrandParentDiv')
    })

    it('try to find an ancestor which does not exist', () => {
      const element = document.getElementById('someImage')
      const ancestor = elementUtilities.findClosestAncestor(element, 'table')
      assert.ok(!ancestor)
    })
  })

  describe('.closestInlineStyle()', () => {
    describe('present', () => {
      it('inclusive', () => {
        const document = domino.createDocument('<br style="top: 0;">')
        const element = document.querySelector('br')
        assert.ok(elementUtilities.closestInlineStyle(element, 'top'))
      })

      it('inclusive with sought value', () => {
        const document = domino.createDocument('<br style="top: 0;">')
        const element = document.querySelector('br')
        assert.ok(elementUtilities.closestInlineStyle(element, 'top', '0'))
      })

      it('inclusive without sought value', () => {
        const document = domino.createDocument('<br style="top: 0;">')
        const element = document.querySelector('br')
        assert.ok(elementUtilities.closestInlineStyle(element, 'top', '1') === undefined)
      })

      it('parent', () => {
        const document = domino.createDocument('<div style="top: 0;"><br></div>')
        const element = document.querySelector('br')
        assert.ok(elementUtilities.closestInlineStyle(element, 'top').tagName === 'DIV')
      })

      it('parent with sought value', () => {
        const document = domino.createDocument('<div style="top: 0;"><br></div>')
        const element = document.querySelector('br')
        assert.ok(elementUtilities.closestInlineStyle(element, 'top', '0').tagName === 'DIV')
      })

      it('parent without sought value', () => {
        const document = domino.createDocument('<div style="top: 0;"><br></div>')
        const element = document.querySelector('br')
        assert.ok(elementUtilities.closestInlineStyle(element, 'top', '1') === undefined)
      })

      it('grandparent', () => {
        const document = domino.createDocument('<div style="top: 0;"><p><br></p></div>')
        const element = document.querySelector('br')
        assert.ok(elementUtilities.closestInlineStyle(element, 'top').tagName === 'DIV')
      })

      it('grandparent with sought value', () => {
        const document = domino.createDocument('<div style="top: 55;"><p><br></p></div>')
        const element = document.querySelector('br')
        assert.ok(elementUtilities.closestInlineStyle(element, 'top', '55').tagName === 'DIV')
      })

      it('grandparent without sought value', () => {
        const document = domino.createDocument('<div style="top: 0;"><p><br></p></div>')
        const element = document.querySelector('br')
        assert.ok(elementUtilities.closestInlineStyle(element, 'top', '55') === undefined)
      })
    })

    describe('absent', () => {
      it('defined', () => {
        const document = domino.createDocument('<div style="bottom: 0;"><p><br></p></div>')
        const element = document.querySelector('br')
        assert.ok(!elementUtilities.closestInlineStyle(element, 'top'))
      })

      it('undefined', () => {
        assert.ok(!elementUtilities.closestInlineStyle(undefined, 'top'))
      })
    })
  })

  describe('.isNestedInTable()', () => {
    it('confirm negative result', () => {
      assert.ok(!elementUtilities.isNestedInTable(document.getElementById('someImage')))
    })

    it('confirm positive result', () => {
      assert.ok(elementUtilities.isNestedInTable(document.getElementById('divInTable')))
    })
  })

  describe('.copyAttributesToDataAttributes()', function Test() {
    beforeEach(() => {
      const html = '<img id=source src=/a width=1> <img id=destination src=/b>'
      const document = domino.createDocument(html)
      this.source = document.querySelector('#source')
      this.destination = document.querySelector('#destination')
      const attributes = ['width', 'height']
      elementUtilities.copyAttributesToDataAttributes(this.source, this.destination, attributes)
    })

    it('present', () => assert.ok(this.destination.getAttribute('data-width') === '1'))
    it('missing', () => assert.ok(!this.destination.hasAttribute('data-height')))
  })

  describe('.copyDataAttributesToAttributes()', function Test() {
    beforeEach(() => {
      const html = '<img id=source src=/a data-width=1> <img id=destination src=/b>'
      const document = domino.createDocument(html)
      const source = document.querySelector('#source')
      this.destination = document.querySelector('#destination')
      const attributes = ['width', 'height']
      elementUtilities.copyDataAttributesToAttributes(source, this.destination, attributes)
    })

    it('present', () => assert.ok(this.destination.getAttribute('width') === '1'))
    it('missing', () => assert.ok(!this.destination.hasAttribute('height')))
  })
})