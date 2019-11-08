import assert from 'assert'
import domino from 'domino'
import fixtureIO from '../utilities/FixtureIO'
import pagelib from '../../build/wikimedia-page-library-transform'

let document

const CollectionUtilities = pagelib.CollectionUtilities

describe('CollectionUtilities', () => {
  beforeEach(() => {
    document = fixtureIO.documentFromFixtureFile('CollectionUtilities.html')
  })

  describe('.collectPageIssues()', () => {
    it('finds issues', () => {
      const issues = CollectionUtilities.collectPageIssues(document)
      assert.equal(issues[0].section.anchor, 'MOS_capacitors_and_band_diagrams')
      // eslint-disable-next-line max-len
      assert.equal(issues[2].html, 'This section <b>is written like a <a href="./Wikipedia:What_Wikipedia_is_not#Wikipedia_is_not_a_publisher_of_original_thought" title="Wikipedia:What Wikipedia is not">personal reflection, personal essay, or argumentative essay</a></b> that states a Wikipedia editor\'s personal feelings or presents an original argument about a topic.  <small class="date-container"><i>(<span class="date">September 2016</span>)</i></small>')
      assert.equal(issues[3].section.id, 50)
    })
    it('empty array returned when no titles exists', () => {
      document = domino.createDocument(
        '<div id=content-block-0>No disambiguation titles here!</div>'
      )
      assert.deepEqual(CollectionUtilities.collectPageIssues(document), [])
    })
  })
  describe('.collectHatnotes()', () => {
    it('finds hatnotes', () => {
      const hatnotes = CollectionUtilities.collectHatnotes(document)
      assert.equal(hatnotes[0].section.anchor, undefined)
      // eslint-disable-next-line max-len
      assert.equal(hatnotes[1].html, 'See also: <a href="./Field_effect_(semiconductor)" title="Field effect (semiconductor)">Field effect (semiconductor)</a>')
      assert.equal(hatnotes[2].links[0], '/wiki/Depletion_region')
    })
    it('empty array returned when no titles exists', () => {
      document = domino.createDocument(
        '<div id=content-block-0>No disambiguation titles here!</div>'
      )
      assert.deepEqual(CollectionUtilities.collectHatnotes(document), [])
    })
  })
})