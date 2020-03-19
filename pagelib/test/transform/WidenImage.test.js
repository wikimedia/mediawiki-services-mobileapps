import assert from 'assert'
import fixtureIO from '../utilities/FixtureIO'
import pagelib from '../../build/wikimedia-page-library-transform'

const ancestorsToWiden = pagelib.WidenImage.test.ancestorsToWiden

let document

describe('WidenImage', () => {
  beforeEach(() => {
    document = fixtureIO.documentFromFixtureFile('WidenImage.html')
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

})