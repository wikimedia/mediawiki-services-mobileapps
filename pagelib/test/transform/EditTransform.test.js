import assert from 'assert'
import fixtureIO from '../utilities/FixtureIO'
import pagelib from '../../build/wikimedia-page-library-transform'
const editTransform = pagelib.EditTransform

describe('EditTransform', () => {
  describe('.setEditButtons()', () => {
    const protection = editTransform.CLASS.PROTECTION
    let document

    beforeEach(() => {
      document = fixtureIO.documentFromFixtureFile('EditTransform.html')
    })

    it('(document) = (document, false, false)', () => {
      editTransform.setEditButtons(document)
      assert.ok(document.documentElement.classList.contains(protection.FORBIDDEN))
      assert.ok(!document.documentElement.classList.contains(protection.PROTECTED))
    })
    it('false, true', () => {
      editTransform.setEditButtons(document, false, true)
      assert.ok(document.documentElement.classList.contains(protection.FORBIDDEN))
      assert.ok(document.documentElement.classList.contains(protection.PROTECTED))
    })
    it('true, false', () => {
      editTransform.setEditButtons(document, true, false)
      assert.ok(!document.documentElement.classList.contains(protection.FORBIDDEN))
      assert.ok(!document.documentElement.classList.contains(protection.PROTECTED))
    })
    it('true, true', () => {
      editTransform.setEditButtons(document, true, true)
      assert.ok(!document.documentElement.classList.contains(protection.FORBIDDEN))
      assert.ok(document.documentElement.classList.contains(protection.PROTECTED))
    })
  })

  describe('.newEditSectionHeader(0, 2)', () => {
    let document
    let element

    beforeEach(() => {
      document = fixtureIO.documentFromFixtureFile('EditTransform.html')
      element = editTransform.newEditSectionHeader(document, 0, 2, 'Title')
    })

    it('returns a non null element', () => {
      assert.ok(element)
    })
    it('creates h2 element', () => {
      assert.equal(element.firstChild.nodeName, 'H2')
    })
    it('has all required attributes', () => {
      assert.ok(element.firstChild.hasAttribute('data-id'))
    })
    it('has child nodes', () => {
      assert.ok(element.firstChild.firstChild)
    })
    it('has desired title', () => {
      const text = element.firstChild.textContent
      assert.ok(text.includes('Title'))
    })
  })

  describe('.newEditSectionHeader(0, 3)', () => {
    let document
    let element

    beforeEach(() => {
      document = fixtureIO.documentFromFixtureFile('EditTransform.html')
      element = editTransform.newEditSectionHeader(document, 0, 3, 'Title')
    })

    it('creates h3 element', () => {
      assert.equal(element.firstChild.nodeName, 'H3')
    })
  })

  describe('.newEditSectionHeader(0, 4)', () => {
    let document
    let element

    beforeEach(() => {
      document = fixtureIO.documentFromFixtureFile('EditTransform.html')
      element = editTransform.newEditSectionHeader(document, 0, 4, 'Title')
    })

    it('creates h4 element', () => {
      assert.equal(element.firstChild.nodeName, 'H4')
    })
  })
})