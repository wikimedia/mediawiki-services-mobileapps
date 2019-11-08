import assert from 'assert'
import domino from 'domino'
import fixtureIO from '../utilities/FixtureIO'
import pagelib from '../../build/wikimedia-page-library-transform'
import styleMocking from '../utilities/StyleMocking'


const widenAncestors = pagelib.WidenImage.test.widenAncestors
const updateExistingStyleValue = pagelib.WidenImage.test.updateExistingStyleValue
const ancestorsToWiden = pagelib.WidenImage.test.ancestorsToWiden
const widenElementByUpdatingStyles = pagelib.WidenImage.test.widenElementByUpdatingStyles
const widenElementByUpdatingExistingStyles =
  pagelib.WidenImage.test.widenElementByUpdatingExistingStyles

let document

describe('WidenImage', () => {
  beforeEach(() => {
    document = fixtureIO.documentFromFixtureFile('WidenImage.html')
  })

  describe('updateExistingStyleValue()', () => {
    it('updates existing style values', () => {
      const doc = domino.createDocument()
      const element = doc.createElement('div')
      styleMocking.mockStylesInElement(element, {
        width: '50%',
        maxWidth: '50%',
        float: 'right'
      })
      updateExistingStyleValue(element.style, 'width', '100%')
      updateExistingStyleValue(element.style, 'maxWidth', '25%')
      updateExistingStyleValue(element.style, 'float', 'left')
      styleMocking.verifyStylesInElement(element, {
        width: '100%',
        maxWidth: '25%',
        float: 'left'
      })
    })

    it('does not update unset style values', () => {
      const doc = domino.createDocument()
      const element = doc.createElement('div')
      element.style.width = ''
      element.style.float = ''
      updateExistingStyleValue(element.style, 'width', '100%')
      updateExistingStyleValue(element.style, 'float', 'left')
      updateExistingStyleValue(element.style, 'maxWidth', '25%')
      assert.equal(element.style.width, '')
      assert.equal(element.style.float, '')
      assert.equal(element.style.maxWidth, '')
    })
  })

  describe('ancestorsToWiden()', () => {
    it('ancestors which need widening for image inside width constrained elements', () => {
      const image = document.getElementById('imageInWidthConstrainedAncestors')
      const ancestors = ancestorsToWiden(image)
      assert.ok(ancestors.length === 3)
      assert.ok(ancestors[0].id === 'widthConstrainedAncestor1')
      assert.ok(ancestors[1].id === 'widthConstrainedAncestor2')
      assert.ok(ancestors[2].id === 'widthConstrainedAncestor3')
    })
  })

  describe('widenElementByUpdatingStyles()', () => {
    it('styles updated whether they exist or not', () => {
      const element = document.querySelector('#widthConstrainedAncestor1')
      assert.equal(element.style.width, '')
      assert.equal(element.style.height, '')
      styleMocking.mockStylesInElement(element, {
        maxWidth: '50%',
        float: 'right'
      })
      widenElementByUpdatingStyles(element)
      styleMocking.verifyStylesInElement(element, {
        width: '100%',
        height: 'auto',
        maxWidth: '100%',
        float: 'none'
      })
    })
  })

  describe('widenElementByUpdatingExistingStyles()', () => {
    it('only existing styles updated', () => {
      const element = document.querySelector('#widthConstrainedAncestor1')
      assert.equal(element.style.width, '')
      assert.equal(element.style.height, '')
      styleMocking.mockStylesInElement(element, {
        maxWidth: '50%',
        float: 'right'
      })
      widenElementByUpdatingExistingStyles(element)
      styleMocking.verifyStylesInElement(element, {
        width: '',
        height: '',
        maxWidth: '100%',
        float: 'none'
      })
    })
  })
})