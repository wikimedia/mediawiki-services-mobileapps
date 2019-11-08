import { LazyLoadTransform } from '../../build/wikimedia-page-library-transform'
import assert from 'assert'
import domino from 'domino'

describe('LazyLoadTransform', () => {
  describe('.queryLazyLoadableImages()', () => {
    describe('images missing one or both dimensions should be returned:', () => {
      it('dimensionless', () => {
        const document = domino.createDocument('<img src=/>')
        const images = LazyLoadTransform.queryLazyLoadableImages(document.documentElement)
        assert.ok(images.length)
      })

      it('no width', () => {
        const document = domino.createDocument('<img height=100 src=/>')
        const images = LazyLoadTransform.queryLazyLoadableImages(document.documentElement)
        assert.ok(images.length)
      })

      it('no height', () => {
        const document = domino.createDocument('<img width=100 src=/>')
        const images = LazyLoadTransform.queryLazyLoadableImages(document.documentElement)
        assert.ok(images.length)
      })
    })

    describe('images with dimension attributes should be considered:', () => {
      describe('images with a small side should not be returned:', () => {
        it('width', () => {
          const document = domino.createDocument('<img width=1 height=100 src=/>')
          const images = LazyLoadTransform.queryLazyLoadableImages(document.documentElement)
          assert.ok(!images.length)
        })

        it('height', () => {
          const document = domino.createDocument('<img width=100 height=1 src=/>')
          const images = LazyLoadTransform.queryLazyLoadableImages(document.documentElement)
          assert.ok(!images.length)
        })
      })

      it('large images should be returned', () => {
        const document = domino.createDocument('<img width=100 height=100 src=/>')
        const images = LazyLoadTransform.queryLazyLoadableImages(document.documentElement)
        assert.ok(images.length)
      })

      describe('images with dimension styles should be considered first:', () => {
        describe('images with a small side should not be returned:', () => {
          it('width', () => {
            const html = '<img style="width: 1px" width=100 height=100 src=/>'
            const document = domino.createDocument(html)
            const images = LazyLoadTransform.queryLazyLoadableImages(document.documentElement)
            assert.ok(!images.length)
          })

          it('height', () => {
            const html = '<img style="height: 1px" width=100 height=100 src=/>'
            const document = domino.createDocument(html)
            const images = LazyLoadTransform.queryLazyLoadableImages(document.documentElement)
            assert.ok(!images.length)
          })
        })

        it('large images should be returned', () => {
          const html = '<img style="width: 100px; height: 100px" width=1 height=1 src=/>'
          const document = domino.createDocument(html)
          const images = LazyLoadTransform.queryLazyLoadableImages(document.documentElement)
          assert.ok(images.length)
        })
      })
    })

    describe('images with dimension styles should support the following units:', () => {
      for (const unit of ['px', 'ex', 'em']) {
        describe(unit, () => {
          it('small', () => {
            const html = `<img style="width: 1${unit}; height: 1${unit}" src=/>`
            const document = domino.createDocument(html)
            const images = LazyLoadTransform.queryLazyLoadableImages(document.documentElement)
            assert.ok(!images.length)
          })

          it('large', () => {
            const html = `<img style="width: 100${unit}; height: 100${unit}" src=/>`
            const document = domino.createDocument(html)
            const images = LazyLoadTransform.queryLazyLoadableImages(document.documentElement)
            assert.ok(images.length)
          })
        })
      }

      it('unknown', () => {
        const html = '<img style="width: 1mm; height: 1mm" src=/>'
        const document = domino.createDocument(html)
        const images = LazyLoadTransform.queryLazyLoadableImages(document.documentElement)
        assert.ok(!images.length)
      })
    })
  })

  describe('.convertImagesToPlaceholders()', () => {
    describe('when an image is converted', () => {
      describe('and dimensions are unspecified', function Test() {
        beforeEach(() => {
          const html = `<img class=classes style='width: 300em; height: 400em' width=100 height=200
            src=/src srcset=/srcset alt=text data-file-width=1 data-file-height=2
            data-image-gallery=true>`
          this.document = domino.createDocument(html)
          const images = LazyLoadTransform.queryLazyLoadableImages(this.document.documentElement)
          this.image = images[0]
          this.placeholder = LazyLoadTransform.convertImagesToPlaceholders(this.document, images)[0]
        })

        describe('the image attributes are preserved as placeholder data-* attributes:', () => {
          it('class', () => assert.ok(this.placeholder.getAttribute('data-class') === 'classes'))
          it('style', () =>
            assert.ok(this.placeholder.getAttribute('data-style')
              === 'width: 300em; height: 400em'))
          it('src', () => assert.ok(this.placeholder.getAttribute('data-src') === '/src'))
          it('srcset', () => assert.ok(this.placeholder.getAttribute('data-srcset') === '/srcset'))
          it('width', () => assert.ok(this.placeholder.getAttribute('data-width') === '100'))
          it('height', () => assert.ok(this.placeholder.getAttribute('data-height') === '200'))
          it('alt', () => assert.ok(this.placeholder.getAttribute('data-alt') === 'text'))
          it('data-file-width',
            () => assert.ok(this.placeholder.getAttribute('data-data-file-width') === '1'))
          it('data-file-height',
            () => assert.ok(this.placeholder.getAttribute('data-data-file-height') === '2'))
          it('data-image-gallery',
            () => assert.ok(this.placeholder.getAttribute('data-data-image-gallery') === 'true'))
        })

        it('the placeholder is a pending class member', () =>
          assert.ok(this.placeholder.classList.contains('pcs-lazy-load-placeholder-pending')))
        it('the classes are otherwise unchanged', () =>
          assert.ok(this.placeholder.classList.contains('classes')))

        it('the placeholder has the same width as the image', () =>
          assert.ok(this.placeholder.style.getPropertyValue('width') === '300em'))
        it('the placeholder has the same height as the image', () => {
          const spacing = this.placeholder.firstElementChild
          assert.ok(spacing.style.getPropertyValue('padding-top') === '133.33333333333331%')
        })

        it('the placeholder is added to the DOM', () =>
          assert.ok(this.document.querySelector('.pcs-lazy-load-placeholder')))
        it('the image is removed from the DOM', () =>
          assert.ok(!this.document.querySelector('img')))
        it('the image is an orphan', () => assert.ok(!this.image.parentNode))
      })
    })
  })

  describe('.loadPlaceholder()', () => {
    describe('when an image is loading', function Test() {
      beforeEach(() => {
        const html = `
          <span class='classes pcs-lazy-load-placeholder pcs-lazy-load-placeholder_pending'
            style='width: 300em' data-class=classes data-style='width: 300em; height 400em'
            data-src=/src data-srcset=/srcset data-width=100 data-height=200 data-alt=text
            data-data-file-width=1 data-data-file-height=2 data-data-image-gallery=true>
            <span style='padding-top: 133.3333%'></span>
          </span>`
        this.document = domino.createDocument(html)
        this.placeholder = this.document.querySelector('.pcs-lazy-load-placeholder')
        this.image = LazyLoadTransform.loadPlaceholder(this.document, this.placeholder)
      })

      describe('the image attributes are restored:', () => {
        it('class', () => assert.ok(this.image.classList.contains('classes')))
        it('style', () =>
          assert.ok(this.image.getAttribute('style') === 'width: 300em; height 400em'))
        it('src', () => assert.ok(this.image.getAttribute('src') === '/src'))
        it('srcset', () => assert.ok(this.image.getAttribute('srcset') === '/srcset'))
        it('width', () => assert.ok(this.image.getAttribute('width') === '100'))
        it('height', () => assert.ok(this.image.getAttribute('height') === '200'))
        it('alt', () => assert.ok(this.image.getAttribute('alt') === 'text'))
        it('data-file-width', () => assert.ok(this.image.getAttribute('data-file-width') === '1'))
        it('data-file-height', () => assert.ok(this.image.getAttribute('data-file-height') === '2'))
        it('data-image-gallery',
          () => assert.ok(this.image.getAttribute('data-image-gallery') === 'true'))
      })

      it('the placeholder is still in the DOM', () =>
        assert.ok(this.document.querySelector('.pcs-lazy-load-placeholder')))
      it('the placeholder is not clickable', () =>
        assert.ok(!(this.placeholder._listeners || {}).click))
      it('the image is not in the DOM', () => assert.ok(!this.document.querySelector('img')))
      it('the image is an orphan', () => assert.ok(!this.image.parentNode))

      it('the placeholder is no longer a pending class member', () =>
        assert.ok(!this.placeholder.classList.contains('pcs-lazy-load-placeholder-pending')))
      it('the placeholder is a loading class member', () =>
        assert.ok(this.placeholder.classList.contains('pcs-lazy-load-placeholder-loading')))
      it('the placeholder classes are otherwise unchanged', () =>
        assert.ok(this.placeholder.classList.contains('classes')))

      it('the image is a loading class member', () =>
        assert.ok(this.image.classList.contains('pcs-lazy-load-image-loading')))
      it('the image classes are otherwise unchanged', () =>
        assert.ok(this.image.classList.contains('classes')))

      const andCompletesLoading = () => { // eslint-disable-line require-jsdoc
        beforeEach(() => this.image.dispatchEvent(new domino.impl.Event('load')))

        it('the image is no longer a loading class member', () =>
          assert.ok(!this.image.classList.contains('pcs-lazy-load-image-loading')))
        it('the image is a loaded class member', () =>
          assert.ok(this.image.classList.contains('pcs-lazy-load-image-loaded')))

        it('the image is added to the the DOM', () =>
          assert.ok(this.document.querySelector('.pcs-lazy-load-image-loaded')))
        it('the placeholder is not clickable', () =>
          assert.ok(!(this.placeholder._listeners || {}).click))
        it('the placeholder is not in the DOM', () =>
          assert.ok(!this.document.querySelector('.pcs-lazy-load-placeholder')))
        it('the placeholder is an orphan', () => assert.ok(!this.placeholder.parentNode))
      }

      const andLoadingFails = () => { // eslint-disable-line require-jsdoc
        beforeEach(() => this.image.dispatchEvent(new domino.impl.Event('error')))

        it('the placeholder is no longer a loading class member', () =>
          assert.ok(!this.placeholder.classList.contains('pcs-lazy-load-placeholder-loading')))
        it('the placeholder is an error class member', () =>
          assert.ok(this.placeholder.classList.contains('pcs-lazy-load-placeholder-error')))

        it('the placeholder is still in the DOM', () =>
          assert.ok(this.document.querySelector('.pcs-lazy-load-placeholder')))
        it('the placeholder is clickable', () => assert.ok(this.placeholder._listeners.click))
        it('the image is not in the DOM', () => assert.ok(!this.document.querySelector('img')))
      }

      describe('and completes loading', andCompletesLoading)

      describe('and loading fails', () => {
        andLoadingFails()

        describe('and loading is retried', () => {
          beforeEach(() => this.placeholder.click())

          describe('and completes loading', andCompletesLoading)
          describe('and loading fails', andLoadingFails)
        })
      })
    })
  })
})