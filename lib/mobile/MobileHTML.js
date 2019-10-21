const P = require('bluebird');

const DocumentWorker = require('../html/DocumentWorker');
const prepareParsoidHtml = require('../processing');
const scaleThumb = require('../media').scaleThumb;
const NodeType = require('../nodeType');
const domUtil = require('../domUtil');
const pagelib = require('../../pagelib/build/wikimedia-page-library-transform.js');
const Edit = pagelib.EditTransform;
const WidenImage = pagelib.WidenImage;
const LazyLoad = pagelib.LazyLoadTransform;
const Table = pagelib.CollapseTable;
const LeadIntroduction = pagelib.LeadIntroductionTransform;

const forbiddenElementClassSubstrings = new Set(['nomobile', 'navbox']);
const forbiddenElementClasses = new Set(['geo-nondefault', 'geo-multi-punct', 'hide-when-compact']);
const forbiddenElementIDs = new Set(['coordinates']);

const forbiddenDivClasses = new Set(['infobox', 'magnify']);

const forbiddenSpanClasses = new Set(['Z3988']);

const attributesToRemoveFromElements = {
  A: ['about', 'data-mw', 'typeof'],
  ABBR: ['title'],
  B: ['about', 'data-mw', 'typeof'],
  BLOCKQUOTE: ['about', 'data-mw', 'typeof'],
  BR: ['about', 'data-mw', 'typeof'],
  CITE: ['about', 'data-mw', 'typeof'],
  CODE: ['about', 'data-mw', 'typeof'],
  DIV: ['data-mw', 'typeof'],
  FIGURE: ['typeof'],
  'FIGURE-INLINE': ['about', 'data-file-type', 'data-mw', 'itemscope', 'itemtype', 'lang', 'rel', 'title', 'typeof'],
  I: ['about', 'data-mw', 'typeof'],
  IMG: ['about', 'alt', 'resource'],
  LI: ['about'],
  LINK: ['data-mw', 'typeof'],
  OL: ['about', 'data-mw', 'typeof'],
  P: ['data-mw', 'typeof'],
  SPAN: ['about', 'data-file-type', 'data-mw', 'itemscope', 'itemtype', 'lang', 'rel', 'title', 'typeof'],
  STYLE: ['about', 'data-mw'],
  SUP: ['about', 'data-mw', 'rel', 'typeof'],
  TABLE: ['about', 'data-mw', 'typeof'],
  UL: ['about', 'data-mw', 'typeof']
};

const mwidRegex = /^mw[\w-]{2,3}$/;
const httpsRegex = /^https:\/\//;
const headerTagRegex = /^H[0-9]$/;
const bracketSpanRegex = /^(\[|\])$/;
const inlineBackgroundStyleRegex = /(?:^|\s|;)background(?:-color)?:\s*(?!(?:transparent)|(?:none)|(?:inherit)|(?:unset)|(?:#?$)|(?:#?;))/;
const infoboxClassRegex = /(?:^|\s)infobox(?:_v3)?(?:\s|$)/;
const infoboxClassExclusionRegex = /(?:^|\s)(?:metadata)|(?:mbox-small)(?:\s|$)/i;
const newClassRegex = /(?:^|\s)new(?:\s|$)/;
  // Images within a "<div class='noresize'>...</div>" should not be widened.
  // Example exhibiting links overlaying such an image:
  //   'enwiki > Counties of England > Scope and structure > Local government'
  // Side-by-side images should not be widened. Often their captions mention 'left' and 'right', so
  // we don't want to widen these as doing so would stack them vertically.
  // Examples exhibiting side-by-side images:
  //    'enwiki > Cold Comfort (Inside No. 9) > Casting'
  //    'enwiki > Vincent van Gogh > Letters'
const widenImageExclusionClassRegex = /(?:tsingle)|(?:noresize)|(?:noviewer)/;
/**
 * MobileHTML is the prepareor for mobile html output.
 * It handles the expensive transforms that need to be
 * applied to a Parsoid document in preparation for mobile display,
 * @param {!Document} doc Parsoid document to process
 */
class MobileHTML extends DocumentWorker {
  constructor(doc) {
    super(doc);
    this.prepareDoc(doc);
    this.linkTitle = domUtil.getParsoidLinkTitle(doc);
    this.plainTitle = domUtil.getParsoidPlainTitle(doc);
    this.nodesToRemove = [];
    this.referenceElements = [];
    this.lazyLoadableImages = [];
    this.redLinks = [];
    this.infoboxes = [];
    this.headers = {};
    this.sections = {};
    this.currentSectionId = 0;
  }

/**
 * Returns a promise that is fufilled by the modified document
 * @param {!Document} doc Parsoid document to process
 * @param {?Array} script the processing scripts to run after prepareing
 * @param {?Object} options script options
 */
  static promise(doc, scripts = [], options = {}) {
    const mobileHTML = new MobileHTML(doc);
    return mobileHTML.promise.then(mobileHTML => {
      return prepareParsoidHtml(mobileHTML.doc, scripts, options);
    });
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

    let sectionId = this.sectionIds.pop();
    if (sectionId) {
       this.prepareSection(sectionId);
       return true;
    }

    const pcs = this.doc.createElement('div');
    pcs.setAttribute('id', 'pcs');
    const body = this.doc.body;
    let children = Array.from(body.children);
    for (let child of children) {
      pcs.appendChild(child);
    }
    body.appendChild(pcs);

    return false;
  }

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
    this.prepareSectionHeader(header, section, sectionId, this.doc);
    let foundNonRefListSection = false;
      let cur = section.firstElementChild;
      while (cur) {
          if (!(cur.classList.contains('reflist')
                  || cur.classList.contains('pcs-edit-esection-eheader'))) {
              foundNonRefListSection = true;
              break;
          }
          cur = cur.nextElementSibling;
      }
      if (!foundNonRefListSection) {
          section.classList.add('pcs-hide-esection');
      }
  }

  prepareDoc(doc) {
    const body = doc.body;
    body.classList.add('content');
    Edit.setEditButtons(doc, false, false);
  }

  prepareReference(element, doc) {
    const placeholder = doc.createElement('div');
    placeholder.classList.add('mw-references-placeholder');
    this.copyAttribute(element, placeholder, 'about');
    element.parentNode.replaceChild(placeholder, element);
  }

  prepareRedLink(element, doc) {
    const span = doc.createElement('span');
    span.innerHTML = element.innerHTML;
    span.setAttribute('class', element.getAttribute('class'));
    element.parentNode.replaceChild(span, element);
  }

  prepareSectionHeader(header, section, sectionId, doc) {
    let headerWrapper;
    if (header) {
      headerWrapper = Edit.newEditSectionWrapper(doc, sectionId, header);
      if (header.parentNode === section) {
        section.insertBefore(headerWrapper, header);
      } else if (section.firstChild) {
        section.insertBefore(headerWrapper, section.firstChild);
      }
      Edit.appendEditSectionHeader(headerWrapper, header);
    }
    const href = this.linkTitle ?
      `/w/index.php?title=${this.linkTitle}&action=edit&section=${sectionId}` : '';
    const link = Edit.newEditSectionLink(doc, sectionId, href);
    const button = Edit.newEditSectionButton(doc, sectionId, link);

    if (headerWrapper) {
      headerWrapper.appendChild(button);
    } else { // lead section:
      if (section.firstChild) {
        section.insertBefore(button, section.firstChild);

      } else {
        section.appendChild(button);
      }
      const floatValue = this.isRTL ? 'left' : 'right';
      button.setAttribute('style', `float: ${floatValue};`);
    }
  }

  isRemovableSpan(span, classList) {
    if (!span.firstChild) {
      return true;
    }
    if (this.isElementWithForbiddenClass(span, classList, forbiddenSpanClasses)) {
      return true;
    }
    if (bracketSpanRegex.test(span.text)) {
      return true;
    }
    return false;
  }

  isRemovableDiv(div, classList) {
    if (this.isElementWithForbiddenClass(div, classList, forbiddenDivClasses)) {
      return true;
    }
    return false;
  }

  isElementWithForbiddenClass(element, classList, classes, substrings = []) {
    let failed = false;
    if (!classList) {
      return false;
    }

    for (let string of substrings) {
      if (classList.includes(string)) {
        failed = true;
        break;
      }
    }

    if (!failed) {
      const split = classList.split(' ');
      for (let cls of split) {
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
    if (forbiddenElementIDs.has(id)) {
      return true;
    }

    if (this.isElementWithForbiddenClass(element,
          classList, forbiddenElementClasses, forbiddenElementClassSubstrings)) {
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
    const schemelessValue = value.replace(httpsRegex, '//');
    element.setAttribute(attrib, schemelessValue);
  }

  isGalleryImage(image) {
    return (image.width >= 128);
  }

  prepareImage(image) {
    scaleThumb(image);
    if (this.isGalleryImage(image)) {
      // Imagemaps, which expect images to be specific sizes, should not be widened.
      // Examples can be found on 'enwiki > Kingdom (biology)':
      //    - first non lead image is an image map
      //    - 'Three domains of life > Phylogenetic Tree of Life' image is an image map
      if (!this.widenImageExcludedNode && !image.hasAttribute('usemap')) {
        WidenImage.widenImage(image);
      }
      this.lazyLoadableImages.push(image);
    }
  }

  prepareAnchor(element, cls) {
    if (newClassRegex.test(cls)) {
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
    const pageTitle = this.plainTitle;
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
    const isInfoBox = infoboxClassRegex.test(cls);
    if (isDiv && !isInfoBox) {
      return;
    }
    if (infoboxClassExclusionRegex.test(cls)) {
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
          if (!this.headers[this.currentSectionId] && headerTagRegex.test(tagName)) {
            this.headers[this.currentSectionId] = element;
          }
          break;
      }

      if (!this.widenImageExcludedNode && widenImageExclusionClassRegex.test(cls)) {
        this.widenImageExcludedNode = element;
      }

      if (this.themeExcludedNode) {
        element.classList.add('notheme');
      } else {
        const style = element.getAttribute('style');
        if (style && inlineBackgroundStyleRegex.test(style)) {
          this.themeExcludedNode = element;
          element.classList.add('notheme');
        }
      }

      const attributesToRemove = attributesToRemoveFromElements[tagName];
      if (attributesToRemove) {
        for (let attrib of attributesToRemove) {
          element.removeAttribute(attrib);
        }
      }

      if (id && mwidRegex.test(id)) {
        element.removeAttribute('id');
      }
    }
  }
}

module.exports = MobileHTML;
