const P = require('bluebird');

const DocumentWorker = require('../html/DocumentWorker');
const thumbnail = require('../thumbnail');
const NodeType = require('../nodeType');
const domUtil = require('../domUtil');
const pagelib = require('../../pagelib/build/wikimedia-page-library-transform');
const Edit = pagelib.EditTransform;
const WidenImage = pagelib.WidenImage;
const LazyLoad = pagelib.LazyLoadTransform;
const Table = pagelib.CollapseTable;
const LeadIntroduction = pagelib.LeadIntroductionTransform;
const constants = require('./MobileHTMLConstants');
const head = require('../transformations/pcs/head');
const addPageHeader = require('../transformations/pcs/addPageHeader');
const parseProperty = require('../parseProperty');

/**
 * MobileHTML is the preparer for mobile html output.
 * It handles the expensive transforms that need to be
 * applied to a Parsoid document in preparation for mobile display,
 * @param {!Document} doc Parsoid document to process
 */
class MobileHTML extends DocumentWorker {
/**
 * prepareElement receives every element as it is iterated
 * over and performs the required transforms. The DOM should
 * not be manipulated inside of this method. Instead, save
 * items for manipulation and perform the manipulation in
 * finalize
 * @param {!Element} element element to process
 */
  prepareElement(element) {
    const id = element.getAttribute('id');
    const tagName = element.tagName;
    const cls = element.getAttribute('class');
    if (this.isRemovableElement(element, tagName, id, cls)) {
      // save here to manipulate the dom later
      this.markForRemoval(element);
    } else if (this.isReference(element)) {
      // save here to manipulate the dom later
      this.referenceElements.push(element);
    } else {
      switch (tagName) {
        case 'A':
          this.prepareAnchor(element, cls);
          break;
        case 'LINK':
          this.makeSchemeless(element, 'href');
          break;
        case 'SCRIPT':
        case 'SOURCE':
          this.makeSchemeless(element, 'src');
          break;
        case 'SECTION':
          this.currentSectionId = element.getAttribute('data-mw-section-id');
          // save for later due to DOM manipulation
          this.sections[this.currentSectionId] = element;
          break;
        case 'IMG':
          this.prepareImage(element);
          break;
        case 'DIV':
          this.prepareDiv(element, cls);
          break;
        case 'TABLE':
          // Images in tables should not be widened
          this.widenImageExcludedNode = element;
          this.prepareTable(element, cls);
          break;
        default:
          if (!this.headers[this.currentSectionId] && constants.headerTagRegex.test(tagName)) {
            this.headers[this.currentSectionId] = element;
          }
          break;
      }

      if (!this.widenImageExcludedNode && constants.widenImageExclusionClassRegex.test(cls)) {
        this.widenImageExcludedNode = element;
      }

      if (this.themeExcludedNode) {
        element.classList.add('notheme');
      } else {
        const style = element.getAttribute('style');
        if (style && constants.inlineBackgroundStyleRegex.test(style)) {
          this.themeExcludedNode = element;
          element.classList.add('notheme');
        }
      }

      const attributesToRemove = constants.attributesToRemoveFromElements[tagName];
      if (attributesToRemove) {
        for (const attrib of attributesToRemove) {
          element.removeAttribute(attrib);
        }
      }

      if (id && constants.mwidRegex.test(id)) {
        element.removeAttribute('id');
      }
    }
  }

  /**
   * Run the next finalization step. All of the DOM manipulation occurs here because
   * manipulating the DOM while walking it will result in an incomplete walk.
   */
  finalizeStep() {
    let node;

    node = this.nodesToRemove.pop();
    if (node) {
      const ancestor = node.parentNode;
      if (ancestor) {
        ancestor.removeChild(node);
      }
      return true;
    }

    node = this.referenceElements.pop();
    if (node) {
      this.prepareReference(node, this.doc);
      return true;
    }

    node = this.infoboxes.pop();
    if (node) {
      this.prepareInfobox(node);
      return true;
    }

    node = this.redLinks.pop();
    if (node) {
      this.prepareRedLink(node, this.doc);
      return true;
    }

    node = this.lazyLoadableImages.pop();
    if (node) {
      LazyLoad.convertImageToPlaceholder(this.doc, node);
      return true;
    }

    if (!this.sectionIds) {
      this.sectionIds = Object.keys(this.sections);
    }

    const sectionId = this.sectionIds.pop();
    if (sectionId) {
      this.prepareSection(sectionId);
      return true;
    }

    const pcs = this.doc.createElement('div');
    pcs.setAttribute('id', 'pcs');
    const body = this.doc.body;
    const children = Array.from(body.children);
    for (const child of children) {
      /* DOM sink status: safe - content from parsoid output */
      pcs.appendChild(child);
    }
    /* DOM sink status: safe - content from parsoid output */
    body.appendChild(pcs);

    head.addCssLinks(this.doc, this.metadata);
    head.addMetaViewport(this.doc);
    head.addPageLibJs(this.doc, this.metadata);

    return false;
  }

/**
 * Returns a MobileHTML object ready for processing
 * @param {!Document} doc document to process
 * @param {?Object} metadata metadata object that should include:
 *   {!string} baseURI the baseURI for the REST API
 *   {!string} revision the revision of the page
 *   {!string} tid the tid of the page
 */
  constructor(doc, metadata) {
    super(doc);
    this.prepareDoc(doc);
    this.nodesToRemove = [];
    this.referenceElements = [];
    this.lazyLoadableImages = [];
    this.redLinks = [];
    this.infoboxes = [];
    this.headers = {};
    this.sections = {};
    this.currentSectionId = 0;
    this.metadata = metadata || {};
    this.metadata.pronunciation = parseProperty.parsePronunciation(doc);
    this.metadata.linkTitle = domUtil.getParsoidLinkTitle(doc);
    this.metadata.plainTitle = domUtil.getParsoidPlainTitle(doc);
  }

/**
 * Adds metadata to the resulting document
 * @param {?Object} mw metadata from MediaWiki with:
 *   {!array} protection
 *   {?Object} originalimage
 *   {!string} displaytitle
 *   {?string} description
 *   {?string} description_source
 */
  addMediaWikiMetadata(mw) {
    this.metadata.mw = mw;
    head.addMetaTags(this.doc, this.metadata);
    addPageHeader(this.doc, this.metadata);
  }

/**
 * Returns a promise that is fulfilled when processing completes.
 * See `constructor` for parameter documentation.
 */
  static promise(doc, metadata = {}) {
    const mobileHTML = new MobileHTML(doc, metadata);
    return mobileHTML.promise;
  }

/**
 * Run the next processing step.
 * @param {!DOMNode} node to process
 */
  process(node) {
    while (this.ancestor && this.ancestor !== node.parentNode) {
      if (this.ancestor === this.themeExcludedNode) {
        this.themeExcludedNode = undefined;
      }
      if (this.ancestor === this.currentInfobox) {
        this.currentInfobox = undefined;
      }
      if (this.ancestor === this.widenImageExcludedNode) {
        this.widenImageExcludedNode = undefined;
      }
      this.ancestor = this.ancestor.parentNode;
    }
    if (node.nodeType === NodeType.ELEMENT_NODE) {
      this.prepareElement(node);
    } else if (node.nodeType === NodeType.COMMENT_NODE) {
      this.markForRemoval(node);
    }
    this.ancestor = node;
  }

  // Specific processing:

  markForRemoval(node) {
    this.nodesToRemove.push(node);
  }

  isReference(node) {
    return node.getAttribute('typeof') === 'mw:Extension/references';
  }

  copyAttribute(src, dest, attr) {
    const value = src.getAttribute(attr);
    if (value !== null) {
        dest.setAttribute(attr, value);
    }
  }

  prepareSection(sectionId) {
    const section = this.sections[sectionId];
    if (sectionId <= 0) {
      LeadIntroduction.moveLeadIntroductionUp(this.doc, section);
    }
    const header = this.headers[sectionId];
    let foundNonRefListSection = false;
    let cur = section.firstElementChild;
    while (cur) {
      // Skip header tags
      const isHeaderTag = constants.headerTagRegex.test(cur.tagName);
      if (!isHeaderTag && !cur.classList.contains('reflist')) {
          foundNonRefListSection = true;
          break;
      }
      cur = cur.nextElementSibling;
    }
    if (foundNonRefListSection) {
      this.prepareSectionHeader(header, section, sectionId, this.doc);
    } else {
      section.parentNode.removeChild(section);
    }
  }

  prepareDoc(doc) {
    const body = doc.body;
    body.classList.add('content');
    Edit.setEditButtons(doc, false, false);
  }

  prepareReference(element) {
    /* DOM sink status: safe - content from parsoid output */
    element.parentNode.removeChild(element);
  }

  prepareRedLink(element, doc) {
    const span = doc.createElement('span');
    /* DOM sink status: safe - content from parsoid output */
    span.innerHTML = element.innerHTML;
    span.setAttribute('class', element.getAttribute('class'));
    /* DOM sink status: safe - content from parsoid output */
    element.parentNode.replaceChild(span, element);
  }

  prepareSectionHeader(header, section, sectionId, doc) {
    if (!header) {
      return;
    }

    const headerWrapper = Edit.newEditSectionWrapper(doc, sectionId, header);
    if (header.parentNode === section) {
      section.insertBefore(headerWrapper, header);
    } else if (section.firstChild) {
      section.insertBefore(headerWrapper, section.firstChild);
    }
    Edit.appendEditSectionHeader(headerWrapper, header);
    const href = this.metadata.linkTitle ?
      `/w/index.php?title=${this.metadata.linkTitle}&action=edit&section=${sectionId}` : '';
    const link = Edit.newEditSectionLink(doc, sectionId, href);
    const button = Edit.newEditSectionButton(doc, sectionId, link);

    /* DOM sink status: safe - content from parsoid output */
    headerWrapper.appendChild(button);
  }

  isRemovableSpan(span, classList) {
    if (!span.firstChild) {
      return true;
    }
    if (this.isElementWithForbiddenClass(span, classList, constants.forbiddenSpanClasses)) {
      return true;
    }
    if (constants.bracketSpanRegex.test(span.text)) {
      return true;
    }
    return false;
  }

  isRemovableDiv(div, classList) {
    if (this.isElementWithForbiddenClass(div, classList, constants.forbiddenDivClasses)) {
      return true;
    }
    return false;
  }

 /**
 * Determines whether or not a certain element should be included in the output
 * @param {!DOMElement} element element to test
 * @param {!string} classList string list of classes separated by spaces. This
 * could be pulled from the element again but we can avoid the performance hit
 * by pulling the list once and passing it in everywhere it's needed.
 * @param {!string[]} classes forbidden classes to check. Element is forbidden
 * if any of the classes fully match any element of this list.
 * @param {?string[]} substrings forbidden substrings to check. Element is forbidden
 * if any part of any class matches any element in this list.
 */
  isElementWithForbiddenClass(element, classList, classes, substrings = []) {
    let failed = false;
    if (!classList) {
      return false;
    }

    for (const string of substrings) {
      if (classList.includes(string)) {
        failed = true;
        break;
      }
    }

    if (!failed) {
      const split = classList.split(' ');
      for (const cls of split) {
        if (classes.has(cls)) {
          failed = true;
          break;
        }
      }
    }

    return failed;
  }

  isRemovableLink(element) {
    return element.getAttribute('rel') !== 'dc:isVersionOf';
  }

  isRemovableElement(element, tagName, id, classList) {
    if (constants.forbiddenElementIDs.has(id)) {
      return true;
    }

    if (this.isElementWithForbiddenClass(element,
          classList,
          constants.forbiddenElementClasses,
          constants.forbiddenElementClassSubstrings)) {
      return true;
    }

    switch (tagName) {
    case 'DIV':
      return this.isRemovableDiv(element, classList);
    case 'SPAN':
      return this.isRemovableSpan(element, classList);
    case 'LINK':
      return this.isRemovableLink(element);
    default:
      return false;
    }
  }

  makeSchemeless(element, attrib) {
    const value = element.getAttribute(attrib);
    if (!value) {
      return;
    }
    const schemelessValue = value.replace(constants.httpsRegex, '//');
    element.setAttribute(attrib, schemelessValue);
  }

  isGalleryImage(image) {
    return (image.width >= 128);
  }

  prepareImage(image) {
    thumbnail.scaleElementIfNecessary(image);
    if (this.isGalleryImage(image)) {
      // Imagemaps, which expect images to be specific sizes, should not be widened.
      // Examples can be found on 'enwiki > Kingdom (biology)':
      //    - first non lead image is an image map
      //    - 'Three domains of life > Phylogenetic Tree of Life' image is an image map
      if (!this.widenImageExcludedNode && !image.hasAttribute('usemap')) {
        // Wrap in a try-catch block to avoid Domino crashing on a malformed style declaration.
        // T238700 which looks the same as T229521
        try {
          WidenImage.widenImage(image);
        } catch (e) { }
      }
      this.lazyLoadableImages.push(image);
    }
  }

  prepareAnchor(element, cls) {
    if (constants.newClassRegex.test(cls)) {
      this.redLinks.push(element);
    }
    const rel = element.getAttribute('rel');
    if (rel !== 'nofollow' && rel !== 'mw:ExtLink') {
      element.removeAttribute('rel');
    }
    this.makeSchemeless(element, 'href');
  }

  prepareInfobox(infobox) {
    const node = infobox.element;
    const isInfoBox = infobox.isInfoBox;
    /* TODO: I18N these strings */
    const pageTitle = this.metadata.plainTitle;
    const title = isInfoBox ? 'Quick facts' : 'More information';
    const footerTitle = 'Close';
    const boxClass = isInfoBox ? Table.CLASS.TABLE_INFOBOX : Table.CLASS.TABLE_OTHER;
    const headerText = Table.getTableHeaderTextArray(this.doc, node, pageTitle);
    if (!headerText.length && !isInfoBox) {
      return;
    }
    Table.prepareTable(node, this.doc, pageTitle, title, boxClass, headerText, footerTitle);
  }

  markInfobox(element, cls, isDiv) {
    if (this.currentInfobox) {
      return;
    }
    const isInfoBox = constants.infoboxClassRegex.test(cls);
    if (isDiv && !isInfoBox) {
      return;
    }
    if (constants.infoboxClassExclusionRegex.test(cls)) {
      return;
    }
    let isHidden;
    // Wrap in a try-catch block to avoid Domino crashing on a malformed style declaration.
    // T229521
    try {
      isHidden = element.style.display === 'none';
    } catch (e) {
      // If Domino fails to parse styles, err on the safe side and don't transform
      isHidden = true;
    }
    if (isHidden) {
      return;
    }
    this.currentInfobox = element;
    this.infoboxes.push({ element, isInfoBox });
  }

  prepareDiv(element, cls) {
    this.markInfobox(element, cls, true);
  }

  prepareTable(element, cls) {
    this.markInfobox(element, cls, false);
  }
}

module.exports = MobileHTML;
