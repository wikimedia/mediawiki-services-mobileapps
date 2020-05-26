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
const Section = pagelib.SectionUtilities;
const ReferenceCollection = pagelib.ReferenceCollection;
const constants = require('./MobileHTMLConstants');
const head = require('../transformations/pcs/head');
const addPageHeader = require('../transformations/pcs/addPageHeader');
const parseProperty = require('../parseProperty');
const Reference = require('./Reference');

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
    // Access attributes once and pass them into the required functions
    // improved performance over calling `getAttribute` multiple times.
    // Also, using precompiled regexes on the class string instead of the classList
    // proved to be more performant.
    const id = element.getAttribute('id');
    const tagName = element.tagName;
    const cls = element.getAttribute('class');
    if (this.isRemovableElement(element, tagName, id, cls)) {
      // save here to manipulate the dom later
      this.markForRemoval(element);
    } else {
      if (this.isTopLevelSection(tagName, element)) {
        this.checkForReferenceSection();
        this.currentSectionId = element.getAttribute('data-mw-section-id');
        // save for later due to DOM manipulation
        this.sections[this.currentSectionId] = element;
      } else if (this.isHeader(tagName)) {
        if (!this.headers[this.currentSectionId]) {
          this.headers[this.currentSectionId] = element;
        }
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
          case 'IMG':
            this.prepareImage(element);
            break;
          case 'OL':
            this.prepareOrderedList(element, cls);
            break;
          case 'LI':
            this.prepareListItem(element, id);
            break;
          case 'SPAN':
            this.prepareSpan(element, cls);
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
            break;
        }

        if (!this.widenImageExcludedNode && constants.widenImageExclusionClassRegex.test(cls)) {
          this.widenImageExcludedNode = element;
        }

        this.checkElementForThemeExclusion(element, cls);
      }

      // Perform these on all non-removeable elements
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

    this.checkForReferenceSection();

    node = this.nodesToRemove.pop();
    if (node) {
      const ancestor = node.parentNode;
      if (ancestor) {
        ancestor.removeChild(node);
      }
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

    node = this.references.pop();
    if (node) {
      this.prepareReference(node);
      return true;
    }

    const pcs = this.doc.createElement('div');
    pcs.setAttribute('id', 'pcs');
    // Hook into existing TemplateStyles for minerva: T250101
    pcs.classList.add('mw-parser-output');

    const body = this.doc.body;
    const children = Array.from(body.children);
    for (const child of children) {
      /* DOM sink status: safe - content from parsoid output */
      pcs.appendChild(child);
    }
    /* DOM sink status: safe - content from parsoid output */
    body.appendChild(pcs);
    // Hook into existing TemplateStyles for minerva: T250101
    body.classList.add('skin-minerva');

    head.addCssLinks(this.doc, this.metadata);
    head.addMetaViewport(this.doc);
    head.addPageLibJs(this.doc, this.metadata);
    head.avoidFaviconRequest(this.doc);
    if (this.localizer && this.localizer.locale) {
      head.addLocale(this.doc, this.localizer.locale);
    }
    return false;
  }

  /**
   * Output mode for MobileHTML. Passed to the MobileHTML constructor to control how the
   * resulting page will look.
   * @returns {!Object} enum with the following fields:
   * - contentAndReferences: article content with references sections collapsed
   * - content: article content only with no references sections, could be used for lazy loading
   * of references to improve load time
   * - references: references only with no article content, could be loaded in lazily and appended
   * to the content output
   * - editPreview: an edit preview version of mobile-html - no page header, no edit UI, no
   * collapsed sections
   */
  static get OutputMode() {
    return {
      contentAndReferences: 0,
      content: 1,
      references: 2,
      editPreview: 3
    };
  }

/**
 * Returns a MobileHTML object ready for processing
 * @param {!Document} doc document to process
 * @param {?Object} metadata metadata object that should include:
 *   {!string} baseURI the baseURI for the REST API
 *   {!string} revision the revision of the page
 *   {!string} tid the tid of the page
 * @param {?MobileHTML.OutputMode} outputMode
 * @param {?Localizer} localizer for localizing UI strings
 */
  constructor(doc, metadata, outputMode = MobileHTML.OutputMode.contentAndReferences, localizer) {
    super(doc);
    this.prepareDoc(doc);
    this.nodesToRemove = [];
    this.lazyLoadableImages = [];
    this.redLinks = [];
    this.infoboxes = [];
    this.references = [];
    this.headers = {};
    this.sections = {};
    this.currentSectionId = '0';
    this.referenceSections = {};
    this.referenceAnchors = {};
    this.metadata = metadata || {};
    this.metadata.pronunciation = parseProperty.parsePronunciation(doc);
    this.metadata.linkTitle = domUtil.getParsoidLinkTitle(doc);
    this.metadata.plainTitle = domUtil.getParsoidPlainTitle(doc);
    this.outputMode = outputMode;
    this.localizer = localizer;
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
    if (this.outputMode === MobileHTML.OutputMode.references
      || this.outputMode === MobileHTML.OutputMode.editPreview) {
        return;
    }

    const isMainPage = head.getIsMainPage(this.doc);
    if (isMainPage) {
      return;
    }

    const namespace = head.getPageNamespace(this.doc);
    if (namespace !== 0) {
      return;
    }

    addPageHeader(this.doc, this.metadata, this.i18n('description-add-link-title'));
  }

/**
 * Returns a promise that is fulfilled when processing completes.
 * See `constructor` for parameter documentation.
 */
  static promise(doc, metadata = {}, outputMode, localizer) {
    const mobileHTML = new MobileHTML(doc, metadata, outputMode, localizer);
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

  isHeader(tagName) {
    return constants.headerTagRegex.test(tagName);
  }

  /**
   * Determines if an element is a reference list that should be treated
   * as an indicator that a section is dedicated to references. If the
   * reference list is inside of a table, this will return false
   * because that generally doesn't indicate a section that's dedicated to showing references.
   * @param {Element} element element to check
   * @param {string} classList class list string of the element. Faster than classList.contains
   * @return {boolean} true if the element is a reference list that isn't wrapped in a table
   */
  isIndicatorOfAReferenceSection(element, classList) {
    let parent = element.parentElement;
    while (parent) {
      if (parent.tagName === 'TD') {
        return false;
      } else if (parent.tagName === 'SECTION') {
        break;
      }
      parent = parent.parentElement;
    }
    // Utilize the reference list class name instead of
    // `element.getAttribute('typeof') === 'mw:Extension/references'`
    // so we only have to check ol elements instead of every div.
    // Also utilizes the classList that we have already for other checks
    // instead of getting a different attribute, which is more expensive.
    return classList && classList.includes(constants.referenceListClassName);
  }

  /**
   * Determines whether an element is a <section> tag with the <body> tag as its parent
   * @param {string} tagName capitalized tag name of the element
   * @param {Element} element
   * @return {boolean} true if the element is a <section> tag and its parent is a <body> tag
   */
  isTopLevelSection(tagName, element) {
    return tagName === 'SECTION' && element.parentElement.tagName === 'BODY';
  }

  /**
   * @return {boolean} true if this document has sections with top level reflists
   */
  get hasReferenceSections() {
    return Object.keys(this.referenceSections).length !== 0;
  }

  /**
   * Mark the current section as a reference section if we've found an indicator that it is
   * a reference section. Reset the indicator if we found it. Also note if this is the first
   * reference section by saving the first reference section id.
   */
  checkForReferenceSection() {
    if (this.outputMode === MobileHTML.OutputMode.editPreview) {
      return;
    }

    if (this.hasReferenceSections || this.foundIndicatorOfAReferenceSection) {
      if (!this.firstReferenceSectionId) {
        this.firstReferenceSectionId = this.currentSectionId;
      }
      this.referenceSections[this.currentSectionId] = this.sections[this.currentSectionId];
    }
    this.foundIndicatorOfAReferenceSection = false;
  }

  copyAttribute(src, dest, attr) {
    const value = src.getAttribute(attr);
    if (value !== null) {
        dest.setAttribute(attr, value);
    }
  }

  checkElementForThemeExclusion(element, cls) {
    if (this.themeExcludedNode) {
      element.classList.add('notheme');
      return;
    }
    const style = element.getAttribute('style');
    if (style && constants.inlineBackgroundStyleRegex.test(style)) {
      element.classList.add('notheme');
      this.themeExcludedNode = element;
      return;
    }
  }

  /**
   * Prepare a reference for mobile-html output. Adjusts the structure
   * of the HTML and adds the appropriate pcs hooks.
   * @param {Element} reference
   */
  prepareReference(reference) {
    if (!reference.textElement) {
      return;
    }

    let child = reference.element.firstChild;
    while (child) {
      const toRemove = child;
      child = child.nextSibling;
      reference.element.removeChild(toRemove);
    }

    const containerDiv = this.doc.createElement('div');
    containerDiv.classList.add(ReferenceCollection.CLASS.REF);

    const numberDiv = this.doc.createElement('div');
    numberDiv.classList.add(ReferenceCollection.CLASS.BACK_LINK_CONTAINER);
    containerDiv.appendChild(numberDiv);

    const anchor = this.doc.createElement('a');
    anchor.id = `back_link_${reference.id}`;
    const originalAnchor = this.referenceAnchors[reference.id];
    if (originalAnchor) {
      const group = originalAnchor.getAttribute('data-mw-group');
      if (group && constants.refGroupsGeneratedByCSS.has(group)) {
        anchor.setAttribute('data-mw-group', group);
        anchor.setAttribute('style', originalAnchor.getAttribute('style'));
      } else {
        const text = originalAnchor.textContent;
        if (text) {
          /* DOM sink status: sanitized text is from page content,
          using textContent causes the content to be escaped */
          anchor.textContent = Reference.truncateLinkText(text);
        } else {
          anchor.textContent = '↑';
        }
      }
    } else {
      anchor.textContent = '↑';
    }

    anchor.classList.add(ReferenceCollection.CLASS.BACK_LINK_ANCHOR);
    anchor.setAttribute(
      'href',
      `./${this.metadata.linkTitle}${ReferenceCollection.BACK_LINK_FRAGMENT_PREFIX}${reference.id}`
    );
    anchor.setAttribute(
      ReferenceCollection.BACK_LINK_ATTRIBUTE,
      JSON.stringify(reference.backLinks)
    );
    numberDiv.appendChild(anchor);

    const referenceBodyDiv = this.doc.createElement('div');
    referenceBodyDiv.classList.add(ReferenceCollection.CLASS.BODY);
    containerDiv.appendChild(referenceBodyDiv);

    referenceBodyDiv.appendChild(reference.textElement);

    reference.element.appendChild(containerDiv);
  }

  prepareSection(sectionId) {
    if (this.outputMode === MobileHTML.OutputMode.references) {
      this.prepareSectionForReferenceOutput(sectionId);
    } else {
      this.prepareSectionForCompleteOrContentOutput(sectionId);
    }
  }

  prepareSectionForCompleteOrContentOutput(sectionId) {
    const section = this.sections[sectionId];
    if (sectionId <= 0) {
      this.moveLeadParagraphUp(sectionId, section);
      this.addLeadSectionButton(sectionId, section);
    } else {
      this.prepareRemainingSection(sectionId, section);
    }
  }

  moveLeadParagraphUp(sectionId, section) {
    let afterElement;
    let child = section.firstElementChild;
    while (child && child.classList && child.classList.contains('hatnote')) {
      afterElement = section.firstChild;
      child = child.nextElementSibling;
    }
    LeadIntroduction.moveLeadIntroductionUp(this.doc, section, afterElement);
  }

  addLeadSectionButton(sectionId, section) {
    if (this.outputMode !== MobileHTML.OutputMode.editPreview) {
      const button = this.prepareEditButton(this.doc, sectionId);
      section.insertBefore(button, section.firstChild);
    }
  }

  prepareRemainingSection(sectionId, section) {
    const isReference = this.outputMode === MobileHTML.OutputMode.contentAndReferences
      && this.referenceSections[sectionId];
    const header = this.headers[sectionId];
    this.prepareSectionHeader(header, section, sectionId, isReference, this.doc);
  }

  prepareSectionForReferenceOutput(sectionId) {
    const section = this.sections[sectionId];
    if (this.referenceSections[sectionId]) {
      const header = this.headers[sectionId];
      this.prepareSectionHeader(header, section, sectionId, false, this.doc);
    } else {
      section.parentNode.removeChild(section);
    }
  }

  prepareDoc(doc) {
    const body = doc.body;
    body.classList.add('content');
    Edit.setEditButtons(doc, false, false);
  }

  prepareRedLink(element, doc) {
    const span = doc.createElement('span');
    /* DOM sink status: safe - content from parsoid output */
    span.innerHTML = element.innerHTML;
    span.setAttribute('class', element.getAttribute('class'));
    /* DOM sink status: safe - content from parsoid output */
    element.parentNode.replaceChild(span, element);
  }

  prepareSectionHeader(header, section, sectionId, isReferenceSection, doc) {
    if (!header) {
      return;
    }

    if (sectionId === this.firstReferenceSectionId &&
        section &&
        this.outputMode !== MobileHTML.OutputMode.editPreview) {
      // Add HR before the first reference section
      Section.createFoldHR(this.doc, section);
    }

    const headerWrapper = Edit.newEditSectionWrapper(doc, sectionId, header);

    if (isReferenceSection && this.outputMode !== MobileHTML.OutputMode.editPreview) {
      Section.prepareForHiding(doc, sectionId, section, headerWrapper, header, this.i18n('article-section-expand'), this.i18n('article-section-collapse'));
    }

    if (header.parentNode === section) {
      section.insertBefore(headerWrapper, header);
    } else if (section.firstChild) {
      section.insertBefore(headerWrapper, section.firstChild);
    }
    Edit.appendEditSectionHeader(headerWrapper, header);

    if (this.outputMode !== MobileHTML.OutputMode.editPreview) {
      const button = this.prepareEditButton(doc, sectionId);

      /* DOM sink status: safe - content from parsoid output */
      headerWrapper.appendChild(button);
    }
  }

  prepareEditButton(doc, sectionId) {
    const href = this.metadata.linkTitle ?
      `/w/index.php?title=${this.metadata.linkTitle}&action=edit&section=${sectionId}` : '';
    const link = Edit.newEditSectionLink(doc, sectionId, href);
    return Edit.newEditSectionButton(doc, sectionId, link, this.i18n('article-edit-button'), this.i18n('article-edit-protected-button'));
  }

  isRemovableSpan(span, classList) {
    if (!span.firstChild) {
      return true;
    }
    if (constants.forbiddenSpanClassRegex.test(classList)) {
      return true;
    }
    if (constants.bracketSpanRegex.test(span.text)) {
      return true;
    }
    return false;
  }

  isRemovableDiv(div, classList) {
    return constants.forbiddenDivClassRegex.test(classList);
  }

  isRemovableLink(element) {
    return element.getAttribute('rel') !== 'dc:isVersionOf';
  }

  isRemovableElement(element, tagName, id, classList) {
    if (constants.forbiddenElementIDRegex.test(id)) {
      return true;
    }

    if (constants.forbiddenElementClassSubstringRegex.test(classList)) {
      return true;
    }

    if (constants.forbiddenElementClassRegex.test(classList)) {
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

  makeSchemeless(element, attrib, val) {
    const value = val || element.getAttribute(attrib);
    if (!value) {
      return;
    }
    const schemelessValue = value.replace(constants.httpsRegex, '//');
    element.setAttribute(attrib, schemelessValue);
  }

  isGalleryImage(image) {
    return (image.width >= 64);
  }

  prepareImage(image) {
    if (this.isGalleryImage(image)) {
      // Imagemaps, which expect images to be specific sizes, should not be widened.
      // Examples can be found on 'enwiki > Kingdom (biology)':
      //    - first non lead image is an image map
      //    - 'Three domains of life > Phylogenetic Tree of Life' image is an image map
      if (!this.widenImageExcludedNode && !image.hasAttribute('usemap')) {
        // Wrap in a try-catch block to avoid Domino crashing on a malformed style declaration.
        // T238700 which looks the same as T229521
        try {
          thumbnail.scaleElementIfNecessary(image);
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
    // .href is slow because it resolves relative links, use getAttribute
    const href = element.getAttribute('href');
    if (href) {
      const fragmentIndex = href.indexOf('#');
      if (fragmentIndex >= 0) {
        const fragment = href.slice(fragmentIndex + 1);
        if (fragment.startsWith(constants.citeNoteIdPrefix)) {
          if (!this.referenceAnchors[fragment]) {
            this.referenceAnchors[fragment] = element;
          }
        } else if (this.currentReference && fragment.startsWith(constants.citeRefIdPrefix)) {
          this.currentReference.backLinks.push(href);
        }
      }
    }

    this.makeSchemeless(element, 'href', href);
  }

  /**
   * Prepare an ordered list element for mobile html output
   * @param {Element} element
   * @param {string} cls
   */
  prepareOrderedList(element, cls) {
    if (this.isIndicatorOfAReferenceSection(element, cls)) {
      this.foundIndicatorOfAReferenceSection = true;
    }
  }

  prepareListItem(element, id) {
    if (id && id.startsWith(constants.citeNoteIdPrefix)) {
      const reference = new Reference(element, id);
      this.currentReference = reference;
      this.references.push(reference);
    }
  }

  prepareSpan(element, cls) {
    if (!this.currentReference || !cls) {
      return;
    }
    if (constants.referenceClassRegex.test(cls)) {
      this.currentReference.textElement = element;
    }
  }

  prepareInfobox(infobox) {
    const node = infobox.element;
    const isInfoBox = infobox.isInfoBox;
    const pageTitle = this.metadata.plainTitle;
    const title = isInfoBox ? this.i18n('info-box-title') : this.i18n('table-title-other');
    const footerTitle = this.i18n('info-box-close-text');
    const boxClass = isInfoBox ? Table.CLASS.TABLE_INFOBOX : Table.CLASS.TABLE_OTHER;
    const headerText = Table.getTableHeaderTextArray(this.doc, node, pageTitle);
    const collapseText = this.i18n('table-collapse');
    const expandText = this.i18n('table-expand');
    if (!headerText.length && !isInfoBox) {
      return;
    }
    Table.prepareTable(node, this.doc, pageTitle, title, boxClass, headerText, footerTitle,
        collapseText, expandText);
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
    if (this.outputMode === MobileHTML.OutputMode.editPreview &&
      constants.referenceWrapClassRegex.test(cls)) {
      // Need to manually add references header
      const header = this.doc.createElement('h2');
      header.innerHTML = this.i18n('references-preview-header');
      element.insertBefore(header, element.childNodes[0]);
    }
  }

  prepareTable(element, cls) {
    this.markInfobox(element, cls, false);
  }

  i18n(phrase) {
    if (!this.localizer) {
      return phrase;
    }
    return this.localizer.i18n(phrase);
  }
}

module.exports = MobileHTML;
