import './LazyLoadTransform.less'
// todo: use imports when other modules are TypeScript.
const ElementGeometry = require('./ElementGeometry').default
const ElementUtilities = require('./ElementUtilities').default
const Polyfill = require('./Polyfill').default

// CSS classes used to identify and present lazily loaded images.
const PLACEHOLDER_CLASS = 'pcs-lazy-load-placeholder'

// Small images, especially icons, are quickly downloaded and may appear in many places. Lazily
// loading these images degrades the experience with little gain. Always eagerly load these images.
// Example: flags in the medal count for the "1896 Summer Olympics medal table."
// https://en.m.wikipedia.org/wiki/1896_Summer_Olympics_medal_table?oldid=773498394#Medal_count
const UNIT_TO_MINIMUM_LAZY_LOAD_SIZE: {[unit in string]?: number} = {
  px: 50, // https://phabricator.wikimedia.org/diffusion/EMFR/browse/master/includes/MobileFormatter.php;c89f371ea9e789d7e1a827ddfec7c8028a549c12$22
  ex: 10, // ''
  em: 5 // 1ex ≈ .5em; https://developer.mozilla.org/en-US/docs/Web/CSS/length#Units
}

/**
 * Replace an image with a placeholder.
 * @param {!Document} document
 * @param {!HTMLImageElement} image The image to be replaced.
 * @return {!HTMLSpanElement} The placeholder replacing image.
 */
const convertImageToPlaceholder = (document: Document, image: HTMLImageElement): HTMLSpanElement => {
  // Replace the original image with a couple spans and replace the spans with a new
  // downloaded image.
  // This option is about the same as MobileFrontend but supports image widening without reflows.

  // Create the root placeholder.
  const placeholder = document.createElement('span')

  // Save the image's attributes to data-* attributes for later restoration.
  ElementUtilities.copyAttributesToDataAttributes(image, placeholder)

  // Copy the image's classes and append the placeholder and current state (pending) classes.
  if (image.hasAttribute('class')) {
    placeholder.setAttribute('class', image.getAttribute('class') || '')
  }
  placeholder.classList.add(PLACEHOLDER_CLASS)

  // Match the image's dimensions, if specified. If image widening is used, this will be overridden
  // by !important priority.
  const geometry = ElementGeometry.from(image)
  if (geometry.width) { placeholder.style.setProperty('width', `${geometry.width}`) }

  // Create a spacer and match the aspect ratio of the original image, if determinable. If image
  // widening is used, this spacer will scale with the width proportionally.
  const spacing = document.createElement('span')
  if (geometry.width && geometry.height) {
    // Assume units are identical.
    const ratio = geometry.heightValue / geometry.widthValue
    spacing.style.setProperty('padding-top', `${ratio * 100}%`)
    spacing.style.setProperty('display', 'block')
  }

  // Append the spacer to the placeholder and replace the image with the placeholder.
  /* DOM sink status: safe - content transform with no user interference */
  placeholder.appendChild(spacing)
  /* DOM sink status: safe - content from parsoid output  */
  if (image.parentNode) image.parentNode.replaceChild(placeholder, image)

  return placeholder
}

/**
 * Replace a placeholder with an image.
 * @param {!Document} document
 * @param {!Element} image The placeholder to be replaced.
 * @return {!HTMLImageElement} The image replacing placeholder.
 */
const convertPlaceholderToImage = (document: Document, placeholder: Element): HTMLImageElement => {
    const image = document.createElement('img');
    // The loading=lazy attribute must come first, since some browsers don't respect it
    // if it comes after the src attribute.
    image.setAttribute('loading', 'lazy');
    ElementUtilities.copyDataAttributesToAttributes(placeholder, image);
    // Add the placeholder CSS class to the img itself while it loads...
    image.classList.add(PLACEHOLDER_CLASS);
    // ...then automatically remove the placeholder class when finished loading.
    image.setAttribute('onload', 'this.classList.remove("' + PLACEHOLDER_CLASS + '")');
    return image;
}

/**
 * @param {!HTMLImageElement} image The image to be considered.
 * @return {!boolean} true if image download can be deferred, false if image should be eagerly
 *                    loaded.
 */
const isLazyLoadable = (image: HTMLImageElement): boolean => {
  const geometry = ElementGeometry.from(image)
  if (!geometry.width || !geometry.height) { return true }
  const minWidth = UNIT_TO_MINIMUM_LAZY_LOAD_SIZE[geometry.widthUnit] || Infinity
  const minHeight = UNIT_TO_MINIMUM_LAZY_LOAD_SIZE[geometry.heightUnit] || Infinity
  return geometry.widthValue >= minWidth && geometry.heightValue >= minHeight
}

/**
 * @param {!Element} element
 * @return {!Array.<HTMLImageElement>} Convertible images descendent from but not including element.
 */
const queryLazyLoadableImages = (element: Element): HTMLImageElement[] =>
  Polyfill.querySelectorAll(element, 'img').filter((image: HTMLImageElement) => isLazyLoadable(image))

/**
 * Convert images with placeholders. The transformation is inverted by calling loadImage().
 * @param {!Document} document
 * @param {!Array.<HTMLImageElement>} images The images to lazily load.
 * @return {!Array.<HTMLSpanElement>} The placeholders replacing images.
 */
const convertImagesToPlaceholders = (document: Document, images: HTMLImageElement[]): HTMLSpanElement[] =>
  images.map(image => convertImageToPlaceholder(document, image))

const convertPlaceholdersToImages = (document: Document) : void => {
  const placeholders = document.querySelectorAll(`.${ PLACEHOLDER_CLASS }`);
  for ( let i = 0; i < placeholders.length; i++ ) {
    const placeholder = placeholders[ i ];
    const image = convertPlaceholderToImage(document, placeholder);
    if (placeholder.parentNode) placeholder.parentNode.replaceChild(image, placeholder);
  }
}

export default {
  PLACEHOLDER_CLASS,
  isLazyLoadable,
  queryLazyLoadableImages,
  convertImageToPlaceholder,
  convertImagesToPlaceholders,
  convertPlaceholderToImage,
  convertPlaceholdersToImages
}
