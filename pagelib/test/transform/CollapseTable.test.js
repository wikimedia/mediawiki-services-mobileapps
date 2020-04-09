import assert from 'assert'
import domino from 'domino'
import pagelib from '../../build/wikimedia-page-library-transform'

describe('CollapseTable', () => {

  describe('isHeaderEligible()', () => {
    const isHeaderEligible = pagelib.CollapseTable.test.isHeaderEligible
    it('when too many links, should not be eligible', () => {
      const doc = domino.createDocument('<table><tr><th><a></a><a></a><a></a></th></tr></table>')
      const header = doc.querySelector('th')
      const isEligible = isHeaderEligible(header)
      assert.equal(isEligible, false)
    })
    it('when 2 links, should be eligible', () => {
      const doc = domino.createDocument('<table><tr><th><a></a><a></a></th></tr></table>')
      const header = doc.querySelector('th')
      const isEligible = isHeaderEligible(header)
      assert.equal(isEligible, true)
    })
    it('when 1 link, should be eligible', () => {
      const doc = domino.createDocument('<table><tr><th><a></a></th></tr></table>')
      const header = doc.querySelector('th')
      const isEligible = isHeaderEligible(header)
      assert.equal(isEligible, true)
    })
    it('when emtpy, should be eligible', () => {
      // headers are eligible if empty, but `extractEligibleHeaderText` is responsible for rejecting
      // them.
      const doc = domino.createDocument('<table><tr><th></th></tr></table>')
      const header = doc.querySelector('th')
      const isEligible = isHeaderEligible(header)
      assert.equal(isEligible, true)
    })
  })

  describe('stringWithNormalizedWhitespace()', () => {
    // 'enwiki > Bonar Bridge'
    const stringWithNormalizedWhitespace = pagelib.CollapseTable.test.stringWithNormalizedWhitespace
    it('leading and trailing whitespace is trimmed', () => {
      assert.equal(stringWithNormalizedWhitespace(' hi '), 'hi')
    })
    it('non-leading/trailing non-breaking spaces converted to breaking spaces', () => {
      assert.equal(stringWithNormalizedWhitespace(
        domino.createDocument('hi&nbsp;hi').firstChild.textContent
      ), 'hi hi')
    })
    it('leading and trailing non-breaking spaces trimmed', () => {
      assert.equal(stringWithNormalizedWhitespace(
        domino.createDocument('&nbsp;hi hi&nbsp;').firstChild.textContent
      ), 'hi hi')
    })
    it('tabs trimmed', () => {
      assert.equal(stringWithNormalizedWhitespace(
        domino.createDocument('\thi\t').firstChild.textContent
      ), 'hi')
    })
    it('non-leading tabs converted to breaking spaces', () => {
      assert.equal(stringWithNormalizedWhitespace(
        domino.createDocument('hi\thi').firstChild.textContent
      ), 'hi hi')
    })
  })

  describe('isHeaderTextEligible()', () => {
    const isHeaderTextEligible = pagelib.CollapseTable.test.isHeaderTextEligible
    it('undefined text is rejected', () => {
      const doc = domino.createDocument('<table><tr><th></th></tr></table>')
      const headerText = doc.querySelector('th').textContent
      const isEligible = isHeaderTextEligible(headerText)
      assert.equal(isEligible, false)
    })
    it('actual text not equal to page title is accepted', () => {
      const doc = domino.createDocument('<table><tr><th>Some text</th></tr></table>')
      const headerText = doc.querySelector('th').textContent
      const isEligible = isHeaderTextEligible(headerText)
      assert.equal(isEligible, true)
    })
    it('node with only comment is rejected', () => {
      const doc = domino.createDocument('<table><tr><th><!--Comment--></th></tr></table>')
      const headerText = doc.querySelector('th').textContent
      const isEligible = isHeaderTextEligible(headerText)
      assert.equal(isEligible, false)
    })
    it('node with only whitespace is rejected', () => {
      const doc = domino.createDocument('<table><tr><th>   </th></tr></table>')
      const headerText = doc.querySelector('th').textContent
      const isEligible = isHeaderTextEligible(headerText)
      assert.equal(isEligible, false)
    })
    it('node with only comment and whitespace is rejected', () => {
      const doc = domino.createDocument('<table><tr><th>   <!--Comment-->   </th></tr></table>')
      const headerText = doc.querySelector('th').textContent
      const isEligible = isHeaderTextEligible(headerText)
      assert.equal(isEligible, false)
    })
    it('node with no text is rejected', () => {
      const doc = domino.createDocument('<table><tr><th></th></tr></table>')
      const headerText = doc.querySelector('th').textContent
      const isEligible = isHeaderTextEligible(headerText)
      assert.equal(isEligible, false)
    })
    it('node with only numbers is rejected', () => {
      // 'enwiki > Lyublinsko-Dmitrovskaya line'
      const doc = domino.createDocument('<table><tr><th>123</th></tr></table>')
      const headerText = doc.querySelector('th').textContent
      const isEligible = isHeaderTextEligible(headerText)
      assert.equal(isEligible, false)
    })
    it('node with only numbers and whitespace is rejected', () => {
      const doc = domino.createDocument('<table><tr><th> 123 </th></tr></table>')
      const headerText = doc.querySelector('th').textContent
      const isEligible = isHeaderTextEligible(headerText)
      assert.equal(isEligible, false)
    })
  })

  describe('extractEligibleHeaderText()', () => {
    const extractEligibleHeaderText = pagelib.CollapseTable.test.extractEligibleHeaderText

    it('extracted text is trimmed', () => {
      const doc = domino.createDocument('<table><tr><th> Some text </th></tr></table>')
      const header = doc.querySelector('th')
      const text = extractEligibleHeaderText(doc, header, 'SampleTitle')
      assert.equal(text, 'Some text')
    })
    it('empty header returns null', () => {
      const doc = domino.createDocument('<table><tr><th></th></tr></table>')
      const header = doc.querySelector('th')
      const text = extractEligibleHeaderText(doc, header, 'SampleTitle')
      assert.equal(text, null)
    })
    it('whitespace header returns null', () => {
      const doc = domino.createDocument('<table><tr><th>    </th></tr></table>')
      const header = doc.querySelector('th')
      const text = extractEligibleHeaderText(doc, header, 'SampleTitle')
      assert.equal(text, null)
    })
    it('text equal to page title returns null', () => {
      const doc = domino.createDocument('<table><tr><th>SampleTitle</th></tr></table>')
      const header = doc.querySelector('th')
      const text = extractEligibleHeaderText(doc, header, 'SampleTitle')
      assert.equal(text, null)
    })
    it('extracted text excludes ref links', () => {
      const doc = domino.createDocument(
        '<table><tr><th>Some text <sup class=mw-ref>[1]</sup></th></tr></table>'
      )
      const header = doc.querySelector('th')
      const text = extractEligibleHeaderText(doc, header, 'SampleTitle')
      assert.equal(text, 'Some text')
    })
    it('extracted text excludes coordinates', () => {
      const doc = domino.createDocument(`
        <table><tr>
          <th>
            Some text
            <span class=geo>0.001,0.002</span>
            <span class=coordinates>0.001,0.002</span>
          </th>
        </tr></table>
      `)
      const header = doc.querySelector('th')
      const text = extractEligibleHeaderText(doc, header, 'SampleTitle')
      assert.equal(text, 'Some text')
    })
    it('extracted text excludes li', () => {
      // 'enwiki > Brussels-Chapel railway station'
      const doc = domino.createDocument(`
        <table><tr>
          <th>
            <ul>
              <li>this
              <li>that
            </ul>
          </th>
        </tr></table>
      `)
      const header = doc.querySelector('th')
      const text = extractEligibleHeaderText(doc, header, 'SampleTitle')
      assert.equal(text, null)
    })
    it('extracted text excludes li but grabs non-li text', () => {
      // 'enwiki > Brussels-Chapel railway station'
      const doc = domino.createDocument(`
        <table><tr>
          <th>
            <ul>
              <li>this
              <li>that
            </ul>
            <i>goat</i>
          </th>
        </tr></table>
      `)
      const header = doc.querySelector('th')
      const text = extractEligibleHeaderText(doc, header, 'SampleTitle')
      assert.equal(text, 'goat')
    })
    it('extracted text excludes style', () => {
      // 'enwiki > Brussels-Chapel railway station'
      const doc = domino.createDocument(`
        <table><tr>
          <th>
            <style>ul {text-align:center}</style>
            <i>goat</i>
          </th>
        </tr></table>
      `)
      const header = doc.querySelector('th')
      const text = extractEligibleHeaderText(doc, header, 'SampleTitle')
      assert.equal(text, 'goat')
    })
    it('extracted text excludes script', () => {
      // 'enwiki > Brussels-Chapel railway station'
      const doc = domino.createDocument(`
        <table><tr>
          <th>
            <script>function(){var x = 1;}</script>
            <i>goat</i>
          </th>
        </tr></table>
      `)
      const header = doc.querySelector('th')
      const text = extractEligibleHeaderText(doc, header, 'SampleTitle')
      assert.equal(text, 'goat')
    })
    it('extracted text skips element if page title starts with element textContent', () => {
      // 'dewiki > Hornburg (Mansfelder Land)'
      // 'enwiki > Ramon Magsaysay High School, Manila'
      const doc =
        domino.createDocument('<table><tr><th>SampleTitle <i>Some text</i></th></tr></table>')
      const header = doc.querySelector('th')
      const text = extractEligibleHeaderText(doc, header, 'SampleTitle')
      assert.equal(text, 'Some text')
    })
    it('extracted text does not skip element if page title does not start with element textContent',
      () => {
        // 'enwiki > Barack Obama'
        const doc =
          domino.createDocument('<table><tr><th>44th <a>President</a></th></tr></table>')
        const header = doc.querySelector('th')
        const text = extractEligibleHeaderText(doc, header, 'SampleTitle')
        assert.equal(text, '44th President')
      })
  })

  describe('isNodeTextContentSimilarToPageTitle()', () => {
    const isNodeTextContentSimilarToPageTitle =
      pagelib.CollapseTable.test.isNodeTextContentSimilarToPageTitle

    describe('TH node textContent and page title considered similar', () => {
      describe('when page title starts with textContent', () => {
        it('full exact match', () => {
          const doc = domino.createDocument('<table><tr><th>Brussels</th></tr></table>')
          const th = doc.querySelector('th')
          const pageTitle = 'Brussels'
          const isSimilar = isNodeTextContentSimilarToPageTitle(th, pageTitle)
          assert.equal(isSimilar, true)
        })
        // 'enwiki > Brussels-Chapel railway station'
        // 'enwiki > Matthew H. Clark'
        // 'enwiki > Adolf Ehrnrooth'
        it('starting exact match', () => {
          const doc = domino.createDocument('<table><tr><th>Brussels</th></tr></table>')
          const th = doc.querySelector('th')
          const pageTitle = 'Brussels Railway'
          const isSimilar = isNodeTextContentSimilarToPageTitle(th, pageTitle)
          assert.equal(isSimilar, true)
        })
        it('and whitespace ignored', () => {
          const doc = domino.createDocument('<table><tr><th> Brussels </th></tr></table>')
          const th = doc.querySelector('th')
          const pageTitle = 'Brussels Railway'
          const isSimilar = isNodeTextContentSimilarToPageTitle(th, pageTitle)
          assert.equal(isSimilar, true)
        })
        it('and non-alphaNumeric text ignored', () => {
          const doc = domino.createDocument('<table><tr><th>Brussels</th></tr></table>')
          const th = doc.querySelector('th')
          const pageTitle = 'Brussels-Railway'
          const isSimilar = isNodeTextContentSimilarToPageTitle(th, pageTitle)
          assert.equal(isSimilar, true)
        })
      })
    })
  })

  describe('firstWordFromString()', () => {
    const firstWordFromString = pagelib.CollapseTable.test.firstWordFromString
    describe('gets first word', () => {
      it('from sentence', () => {
        assert.equal(firstWordFromString('food is good'), 'food')
      })
      it('from word', () => {
        assert.equal(firstWordFromString('food'), 'food')
      })
      it('from word followed by dash', () => {
        assert.equal(firstWordFromString('food-'), 'food')
      })
      it('from word followed by punctuation', () => {
        assert.equal(firstWordFromString('food.'), 'food')
      })
    })
    describe('gets null', () => {
      it('from zero length string', () => {
        assert.equal(firstWordFromString(''), null)
      })
      it('from whitespace string', () => {
        assert.equal(firstWordFromString(' '), null)
      })
      it('from punctuation string', () => {
        assert.equal(firstWordFromString('.'), null)
      })
      it('from dash string', () => {
        assert.equal(firstWordFromString('-'), null)
      })
    })
  })

  describe('getTableHeaderTextArray()', () => {
    const getTableHeaderTextArray = pagelib.CollapseTable.test.getTableHeaderTextArray

    it('when no table, shouldn\'t find headers', () => {
      const doc = domino.createDocument('<html></html>')
      const actual = getTableHeaderTextArray(doc, doc.documentElement, 'pageTitle')
      assert.deepEqual(actual, [])
    })

    describe('when table', () => {
      it('and no header, shouldn\'t find headers', () => {
        const doc = domino.createDocument('<table></table>')
        const actual = getTableHeaderTextArray(doc, doc.querySelector('table'), 'pageTitle')
        assert.deepEqual(actual, [])
      })

      it('and header is empty, shouldn\'t find headers', () => {
        const doc = domino.createDocument('<table><tr><th></th></tr></table>')
        const actual = getTableHeaderTextArray(doc, doc.querySelector('table'), 'pageTitle')
        assert.deepEqual(actual, [])
      })

      describe('and header is nonempty', () => {
        it('and link is empty, shouldn\'t find header', () => {
          const doc = domino.createDocument('<table><tr><th><a></a></th></tr></table>')
          const actual = getTableHeaderTextArray(doc, doc.querySelector('table'), 'pageTitle')
          assert.deepEqual(actual, [])
        })

        it('and two headers have identical text', () => {
          const doc = domino.createDocument('<table><tr><th>type</th><th>type</th></tr></table>')
          const actual = getTableHeaderTextArray(doc, doc.querySelector('table'), 'pageTitle')
          assert.deepEqual(actual, ['type'])
        })

        describe('and link is nonempty', () => {
          it('and doesn\'t match page title, should find header', () => {
            const doc = domino.createDocument('<table><tr><th><a>text</a></th></tr></table>')
            const actual = getTableHeaderTextArray(doc, doc.querySelector('table'), 'pageTitle')
            assert.deepEqual(actual, ['text'])
          })

          it('and matches page title, shouldn\'t find header', () => {
            const doc = domino.createDocument('<table><tr><th><a>pageTitle</a></th></tr></table>')
            const actual = getTableHeaderTextArray(doc, doc.querySelector('table'), 'pageTitle')
            assert.deepEqual(actual, [])
          })

          it('and no page title, should find header', () => {
            const doc = domino.createDocument('<table><tr><th><a>text</a></th></tr></table>')
            const actual = getTableHeaderTextArray(doc, doc.querySelector('table'))
            assert.deepEqual(actual, ['text'])
          })
        })
      })
    })
  })

  describe('toggleCollapseClickCallback()', () => {
    const toggleCollapseClickCallback = pagelib.CollapseTable.toggleCollapseClickCallback

    describe('and an expanded container', () => {
      beforeEach(function Test() {
        const html = `
          <div id=header><span class=app-table-collapsed-caption></span></div>
          <table></table>
          <div id=footer></div>`
        this.doc = domino.createDocument(html)
      })

      describe('where the footer is observed', () => {
        it('the callback is invoked when the footer is clicked',
          function Test(done) {
            const footer = this.doc.querySelector('#footer')
            footer.addEventListener('click',
              toggleCollapseClickCallback.bind(footer, () => done()))
            footer.click()
          })

        it('nothing breaks when the callback is not set and the footer is clicked',
          function Test() {
            const footer = this.doc.querySelector('#footer')
            footer.addEventListener('click',
              toggleCollapseClickCallback.bind(footer, undefined))
            footer.click()
          })
      })

      describe('where the header is observed,', () => {
        beforeEach(function Test() {
          this.header = this.doc.querySelector('#header')
          this.header.addEventListener('click',
            toggleCollapseClickCallback.bind(this.header, () => {}))
        })

        it('the callback is not invoked when the header clicked', function Test() {
          this.header.addEventListener('click',
            toggleCollapseClickCallback.bind(this.header, () => { assert.fail() }))
          this.header.click()
        })

        it('the header class list toggles when clicked', function Test() {
          this.header.click()
          assert.ok(this.header.classList.contains('pcs-collapse-table-expanded'))
          assert.ok(!this.header.classList.contains('pcs-collapse-table-collapsed'))
          assert.ok(!this.header.classList.contains('pcs-collapse-table-icon'))
        })

        it('the header class list toggles back when clicked twice', function Test() {
          this.header.click()
          this.header.click()
          assert.ok(!this.header.classList.contains('pcs-collapse-table-expanded'))
          assert.ok(this.header.classList.contains('pcs-collapse-table-collapsed'))
          assert.ok(this.header.classList.contains('pcs-collapse-table-icon'))
        })

        it('the caption is shown when clicked', function Test() {
          this.header.click()
          const caption = this.doc.querySelector('span')
          assert.ok(caption.style.visibility !== 'hidden')
        })

        it('the caption is still shown when clicked twice', function Test() {
          this.header.click()
          this.header.click()
          const caption = this.doc.querySelector('span')
          assert.ok(caption.style.visibility !== 'hidden')
        })

        it('the table is collapsed when clicked', function Test() {
          this.header.click()
          const table = this.doc.querySelector('table')
          assert.deepEqual(table.style.display, 'none')
        })

        it('the table is expanded when clicked twice', function Test() {
          this.header.click()
          this.header.click()
          const table = this.doc.querySelector('table')
          assert.deepEqual(table.style.display, 'block')
        })

        it('the footer is hidden when clicked', function Test() {
          this.header.click()
          const footer = this.doc.querySelector('#footer')
          assert.deepEqual(footer.style.display, 'none')
        })

        it('the footer is shown when clicked twice', function Test() {
          this.header.click()
          this.header.click()
          const footer = this.doc.querySelector('#footer')
          assert.deepEqual(footer.style.display, 'block')
        })
      })
    })
  })

  describe('shouldTableBeCollapsed()', () => {
    const shouldTableBeCollapsed = pagelib.CollapseTable.test.shouldTableBeCollapsed

    it('the table is generic and should be collapsed', () => {
      const doc = domino.createDocument('<table></table>')
      assert.ok(shouldTableBeCollapsed(doc.querySelector('table')))
    })

    it('the table is already collapsed and shouldn\'t be collapsed again', () => {
      const doc = domino.createDocument('<table style="display: none"></table>')
      assert.ok(!shouldTableBeCollapsed(doc.querySelector('table')))
    })

    describe('the table is a navbox and shouldn\'t be collapsed', () => {
      for (const clazz of ['navbox', 'vertical-navbox', 'navbox-inner']) {
        it(`as identified by the class "${clazz}"`, () => {
          const doc = domino.createDocument(`<table class=${clazz}></table>`)
          assert.ok(!shouldTableBeCollapsed(doc.querySelector('table')))
        })
      }
    })

    // https://www.mediawiki.org/wiki/Template:Mbox
    it('the table is a multi namespace message box and shouldn\'t be collapsed', () => {
      const doc = domino.createDocument('<table class=mbox-small></table>')
      assert.ok(!shouldTableBeCollapsed(doc.querySelector('table')))
    })
  })

  describe('isInfobox()', () => {
    const isInfobox = pagelib.CollapseTable.test.isInfobox

    it('the element is not an infobox', () => {
      const doc = domino.createDocument('<div></div>')
      assert.ok(!isInfobox(doc.querySelector('div')))
    })

    it('the element is an infobox', () => {
      const doc = domino.createDocument('<div class=infobox></div>')
      assert.ok(isInfobox(doc.querySelector('div')))
    })
  })

  describe('newCollapsedHeaderDiv()', () => {
    const newCollapsedHeaderDiv = pagelib.CollapseTable.test.newCollapsedHeaderDiv

    it('the div is created', () => {
      const doc = domino.createDocument()
      const frag = doc.createDocumentFragment()
      const div = newCollapsedHeaderDiv(doc, frag)
      assert.ok(div instanceof domino.impl.HTMLDivElement)
    })

    it('the div is a container', () => {
      const doc = domino.createDocument()
      const frag = doc.createDocumentFragment()
      const div = newCollapsedHeaderDiv(doc, frag)
      assert.ok(div.classList.contains('pcs-collapse-table-collapsed-container'))
    })

    it('the div is expanded', () => {
      const doc = domino.createDocument()
      const frag = doc.createDocumentFragment()
      const div = newCollapsedHeaderDiv(doc, frag)
      assert.ok(div.classList.contains('pcs-collapse-table-expanded'))
    })

    it('when contents is undefined, the div has no contents', () => {
      const doc = domino.createDocument()
      const frag = doc.createDocumentFragment()
      const div = newCollapsedHeaderDiv(doc, frag)
      assert.ok(!div.innerHTML)
    })

    it('when contents are defined, the div has contents', () => {
      const doc = domino.createDocument()
      const frag = doc.createDocumentFragment()
      const text = doc.createTextNode('contents')
      frag.appendChild(text)
      const div = newCollapsedHeaderDiv(doc, frag)
      assert.deepEqual(div.innerHTML, 'contents')
    })
  })

  describe('newCollapsedFooterDiv()', () => {
    const newCollapsedFooterDiv = pagelib.CollapseTable.test.newCollapsedFooterDiv

    it('the div is created', () => {
      const div = newCollapsedFooterDiv(domino.createDocument())
      assert.ok(div instanceof domino.impl.HTMLDivElement)
    })

    it('the div is a footer div', () => {
      const div = newCollapsedFooterDiv(domino.createDocument())
      assert.ok(div.classList.contains('pcs-collapse-table-collapsed-bottom'))
    })

    it('the div has an icon', () => {
      const div = newCollapsedFooterDiv(domino.createDocument())
      assert.ok(div.classList.contains('pcs-collapse-table-icon'))
    })

    it('when contents is undefined, the div has no contents', () => {
      const div = newCollapsedFooterDiv(domino.createDocument())
      assert.ok(!div.innerHTML)
    })

    it('when contents are defined, the div has contents', () => {
      const div = newCollapsedFooterDiv(domino.createDocument(), 'contents')
      assert.deepEqual(div.innerHTML, 'contents')
    })
  })

  describe('newCaptionFragment()', () => {
    const newCaptionFragment = pagelib.CollapseTable.test.newCaptionFragment

    describe('when no header text', () => {
      const caption = newCaptionFragment(domino.createDocument(), 'title', 'titleClass',[])
      it('the title is present', () => {
        assert.ok(caption.textContent.includes('title'))
      })

      it('no additional text is shown', () => {
        assert.ok(!caption.textContent.includes(','))
      })

      it('title class is set to allow distinguishing types of tables', () => {
        assert.ok(caption.querySelector('strong').classList.contains('titleClass'))
      })
    })

    describe('when a one element header text', () => {
      const caption = newCaptionFragment(domino.createDocument(), 'title', 'titleClass',['0'])

      it('the title is present', () => {
        assert.ok(caption.textContent.includes('title'))
      })

      it('the first entry is shown', () => {
        assert.ok(caption.textContent.includes('0'))
      })

      it('an ellipsis is shown', () => {
        assert.ok(caption.textContent.includes('...'))
      })
    })

    describe('when a two element header text', () => {
      const caption = newCaptionFragment(domino.createDocument(), 'title', 'titleClass',['0', '1'])

      it('the title is present', () => {
        assert.ok(caption.textContent.includes('title'))
      })

      it('the first entry is shown', () => {
        assert.ok(caption.textContent.includes('0'))
      })

      it('an ellipsis is shown', () => {
        assert.ok(caption.textContent.includes('...'))
      })

      it('the second entry is shown', () => {
        assert.ok(caption.textContent.includes('1'))
      })
    })
  })

  describe('collapseTables()', () => {
    const collapseTables = pagelib.CollapseTable.collapseTables

    it('when no tables exist, nothing is done', () => {
      const window = domino.createWindow('<html></html>')
      collapseTables(window, window.document, 'pageTitle')
      assert.ok(window.document.documentElement)
    })

    describe('when one table exists', () => {
      beforeEach(function Test() {
        const html = '<table><tr><th><a>text</a></th></tr></table>'
        this.window = domino.createWindow(html)
        this.assertTableIsExpanded = () => {
          assert.ok(this.window.document.querySelector('table').parentElement.style.display !== 'none')
        }
        this.assertTableIsCollapsed = () => {
          assert.deepEqual(this.window.document.querySelector('table').parentElement.style.display, 'none')
        }
      })

      it('and it\'s a main page, nothing is done', function Test() {
        collapseTables(this.window, this.window.document, 'pageTitle', true)
        this.assertTableIsExpanded()
      })

      it('and it\'s already inside of a container, nothing is done', function Test() {
        this.window.document.querySelector('table')
          .parentNode.classList.add('pcs-collapse-table-container')
        collapseTables(this.window, this.window.document, 'pageTitle')
        this.assertTableIsExpanded()
      })

      it('and it shouldn\'t be collapsed, nothing is done', function Test() {
        this.window.document.querySelector('table').classList.add('navbox')
        collapseTables(this.window, this.window.document, 'pageTitle')
        this.assertTableIsExpanded()
      })

      describe('and no header text', () => {
        beforeEach(function Test() {
          const tableHeader = this.window.document.querySelector('tr')
          tableHeader.parentNode.removeChild(tableHeader)
        })

        it('and table is not an infobox, nothing is done', function Test() {
          collapseTables(this.window, this.window.document)
          this.assertTableIsExpanded()
        })

        it('and table is an infobox, table is collapsed', function Test() {
          this.window.document.querySelector('table').classList.add('infobox')
          collapseTables(this.window, this.window.document)
          this.assertTableIsCollapsed()
        })
      })

      describe('and table is eligible,', () => {
        it('table is collapsed', function Test() {
          collapseTables(this.window, this.window.document, 'pageTitle')
          this.assertTableIsCollapsed()
        })

        it('table is replaced with a new container in the parent', function Test() {
          const table = this.window.document.querySelector('table')
          table.parentNode.parentNode.id = 'container'
          collapseTables(this.window, this.window.document, 'pageTitle')
          assert.ok(table.parentNode.parentNode.id !== 'container')
        })

        it('table is wrapped in a container', function Test() {
          collapseTables(this.window, this.window.document, 'pageTitle')
          const table = this.window.document.querySelector('table')
          assert.ok(table.parentNode.parentNode.classList.contains('pcs-collapse-table-container'))
        })

        it('table has a header', function Test() {
          collapseTables(this.window, this.window.document, 'pageTitle')
          assert.ok(this.window.document.querySelector('.pcs-collapse-table-expanded'))
        })

        it('table has a footer', function Test() {
          collapseTables(this.window, this.window.document, 'pageTitle')
          assert.ok(this.window.document.querySelector('.pcs-collapse-table-collapsed-bottom'))
        })

        it('table expands when header is clicked', function Test() {
          collapseTables(this.window, this.window.document, 'pageTitle')
          this.window.document.querySelector('table').parentNode.parentNode.children[0].click()
          this.assertTableIsExpanded()
        })

        it('event is emitted when header is clicked', function Test(done) {
          collapseTables(this.window, this.window.document, 'pageTitle')
          this.window.addEventListener(pagelib.CollapseTable.SECTION_TOGGLED_EVENT_TYPE, event => {
            assert.ok(!event.collapsed)
            done()
          })
          this.window.document.querySelector('table').parentNode.parentNode.children[2].click()
        })

        it('table expands when footer is clicked', function Test() {
          collapseTables(this.window, this.window.document, 'pageTitle')
          this.window.document.querySelector('table').parentNode.parentNode.children[2].click()
          this.assertTableIsExpanded()
        })

        it('footer click callback is not called when header is expanded', function Test() {
          collapseTables(this.window, this.window.document, 'pageTitle', null, null, null, null,
            () => { assert.fail() })
          this.window.document.querySelector('table').parentNode.parentNode.children[0].click()
          this.window.document.querySelector('table').parentNode.parentNode.children[0].click()
        })

        it('footer click callback is called when footer is expanded', function Test(done) {
          collapseTables(this.window, this.window.document, 'pageTitle', null, null, null, null,
            () => done())
          this.window.document.querySelector('table').parentNode.parentNode.children[2].click()
          this.window.document.querySelector('table').parentNode.parentNode.children[2].click()
        })

        it('event is emitted when footer is clicked', function Test(done) {
          collapseTables(this.window, this.window.document, 'pageTitle')
          this.window.document.querySelector('table').parentNode.parentNode.children[2].click()
          this.window.addEventListener(pagelib.CollapseTable.SECTION_TOGGLED_EVENT_TYPE, event => {
            assert.ok(event.collapsed)
            done()
          })
          this.window.document.querySelector('table').parentNode.parentNode.children[2].click()
        })

        it('table header is used', function Test() {
          collapseTables(this.window, this.window.document)
          const header = this.window.document.querySelector('.pcs-collapse-table-expanded')
          assert.ok(header)
        })

        it('and page title is specified, table header is used', function Test() {
          collapseTables(this.window, this.window.document, 'pageTitle')
          const header = this.window.document.querySelector('.pcs-collapse-table-expanded')
          assert.ok(header.innerHTML.includes('text'))
        })

        describe('and table is an infobox,', () => {
          beforeEach(function Test() {
            this.window.document.querySelector('table').classList.add('infobox')
          })

          it('and page title is specified, header is used', function Test() {
            collapseTables(this.window, this.window.document, 'pageTitle')
            const header = this.window.document.querySelector('.pcs-collapse-table-expanded')
            assert.ok(header.innerHTML.includes('text'))
          })

          it('and infobox title is specified, infobox title is used', function Test() {
            collapseTables(this.window, this.window.document, 'pageTitle', null, 'infoboxTitle')
            const header = this.window.document.querySelector('.pcs-collapse-table-expanded')
            assert.ok(header.innerHTML.includes('infoboxTitle'))
          })
        })

        it('and non-infobox title is specified, non-infobox title is used', function Test() {
          collapseTables(this.window, this.window.document, 'pageTitle', null, null, 'otherTitle')
          const header = this.window.document.querySelector('.pcs-collapse-table-expanded')
          assert.ok(header.innerHTML.includes('otherTitle'))
        })

        it('footer title is unused', function Test() {
          collapseTables(this.window, this.window.document, 'pageTitle')
          const footer =
            this.window.document.querySelector('.pcs-collapse-table-collapsed-bottom')
          assert.ok(!footer.innerHTML)
        })

        it('and footer title is specified, footer title is used', function Test() {
          collapseTables(this.window, this.window.document, 'pageTitle', null, null, null,
            'footerTitle')
          const footer =
            this.window.document.querySelector('.pcs-collapse-table-collapsed-bottom')
          assert.deepEqual(footer.innerHTML, 'footerTitle')
        })
      })
    })

    it('when more than one eligible table exists, each is collapsed', () => {
      const html = `
        <table id=a class=infobox></table>
        <table id=b></table>
        <table id=c class=infobox></table>
        <table id=d class=infobox></table>`
      const window = domino.createWindow(html)
      collapseTables(window, window.document)
      assert.deepEqual(window.document.getElementById('a').parentElement.style.display, 'none')
      assert.ok(!window.document.getElementById('b').parentElement.style.display)
      assert.deepEqual(window.document.getElementById('c').parentElement.style.display, 'none')
      assert.deepEqual(window.document.getElementById('d').parentElement.style.display, 'none')
    })
  })

  describe('expandCollapsedTableIfItContainsElement()', () => {
    const expandCollapsedTableIfItContainsElement =
      pagelib.CollapseTable.expandCollapsedTableIfItContainsElement

    it('when element is undefined, nothing is done', () => {
      const element = undefined
      expandCollapsedTableIfItContainsElement(element)
    })

    describe('when element is defined', () => {
      it('and element is not within a collapse table container, nothing is done', () => {
        const element = domino.createDocument('<a></a>').documentElement
        element.addEventListener('click', assert.fail)
        expandCollapsedTableIfItContainsElement(element)
      })

      describe('and element is within a collapse table container that has children', () => {
        it('and table is already expanded, nothing is done', () => {
          const html = `
            <div class=pcs-collapse-table-container>
              <div class=pcs-collapse-table-collapsed></div>
            </div>`
          const element = domino.createDocument(html).querySelector('div div')
          element.addEventListener('click', assert.fail)
          expandCollapsedTableIfItContainsElement(element)
        })

        it('and table is collapsed, the table is expanded', done => {
          const html = `
            <div class=pcs-collapse-table-container>
              <div class=pcs-collapse-table-expanded></div>
            </div>`
          const element = domino.createDocument(html).querySelector('div div')
          element.addEventListener('click', () => done())
          expandCollapsedTableIfItContainsElement(element)
        })
      })
    })
  })


  describe('replaceNodeWithBreakingSpaceTextNode()', () => {
    const replaceNodeWithBreakingSpaceTextNode =
      pagelib.CollapseTable.test.replaceNodeWithBreakingSpaceTextNode

    it('Replaces BR with single breaking space', () => {
      // 'enwiki > Greece'
      const doc = domino.createDocument(`
        <span>Capital<br>and largest city</span>
      `)
      replaceNodeWithBreakingSpaceTextNode(doc, doc.querySelector('br'))
      assert.equal(doc.querySelector('span').textContent, 'Capital and largest city')
    })
  })
})