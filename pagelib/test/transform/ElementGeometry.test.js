import assert from 'assert'
import domino from 'domino'
import pagelib from '../../build/wikimedia-page-library-transform'
const ElementGeometry = pagelib.test.ElementGeometry

describe('ElementGeometry', () => {
  describe('.from()', () => {
    it('decimal separator', () => {
      const document = domino.createDocument('<img src=/ style="width: 1.1em">')
      const geometry = ElementGeometry.from(document.querySelector('img'))
      assert.ok(geometry.widthValue === 1.1)
      assert.ok(geometry.widthUnit === 'em')
    })

    it('integral', () => {
      const document = domino.createDocument('<img src=/ style="width: 1em">')
      const geometry = ElementGeometry.from(document.querySelector('img'))
      assert.ok(geometry.widthValue === 1)
      assert.ok(geometry.widthUnit === 'em')
    })

    it('fractional', () => {
      const document = domino.createDocument('<img src=/ style="width: .1em">')
      const geometry = ElementGeometry.from(document.querySelector('img'))
      assert.ok(geometry.widthValue === .1)
      assert.ok(geometry.widthUnit === 'em')
    })

    it('trailing decimal point', () => {
      const document = domino.createDocument('<img src=/ style="width: 1.em">')
      const geometry = ElementGeometry.from(document.querySelector('img'))
      assert.ok(geometry.widthValue === 1)
      assert.ok(geometry.widthUnit === 'em')
    })

    it('unit', () => {
      const document = domino.createDocument('<img src=/ style="width: 10px">')
      const geometry = ElementGeometry.from(document.querySelector('img'))
      assert.ok(geometry.widthValue === 10)
      assert.ok(geometry.widthUnit === 'px')
    })

    it('unitless', () => {
      const document = domino.createDocument('<img src=/ style="width: 0">')
      const geometry = ElementGeometry.from(document.querySelector('img'))
      assert.ok(geometry.widthValue === 0)
      assert.ok(geometry.widthUnit === 'px')
    })

    it('attribute', () => {
      const document = domino.createDocument('<img src=/ width=1>')
      const geometry = ElementGeometry.from(document.querySelector('img'))
      assert.ok(geometry.widthValue === 1)
      assert.ok(geometry.widthUnit === 'px')
    })

    it('attribute override', () => {
      const document = domino.createDocument('<img src=/ width=1 style="width: 2em">')
      const geometry = ElementGeometry.from(document.querySelector('img'))
      assert.ok(geometry.widthValue === 2)
      assert.ok(geometry.widthUnit === 'em')
    })

    it('height', () => {
      const document = domino.createDocument('<img src=/ style="height: 1em">')
      const geometry = ElementGeometry.from(document.querySelector('img'))
      assert.ok(geometry.heightValue === 1)
      assert.ok(geometry.heightUnit === 'em')
    })

    it('default', () => {
      const document = domino.createDocument('<img src=/>')
      const geometry = ElementGeometry.from(document.querySelector('img'))
      assert.ok(geometry.width === undefined)
      assert.ok(isNaN(geometry.widthValue))
      assert.ok(geometry.widthUnit === 'px')
      assert.ok(geometry.height === undefined)
      assert.ok(isNaN(geometry.heightValue))
      assert.ok(geometry.heightUnit === 'px')
    })
  })
})