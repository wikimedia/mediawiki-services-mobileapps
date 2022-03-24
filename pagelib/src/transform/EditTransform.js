import './EditTransform.less'
import { ARIA } from './HTMLUtilities'

const CLASS = {
  SECTION_HEADER: 'pcs-edit-section-header',
  TITLE: 'pcs-edit-section-title',
  LINK_CONTAINER: 'pcs-edit-section-link-container',
  LINK: 'pcs-edit-section-link',
  PROTECTION: { UNPROTECTED: '', PROTECTED: 'page-protected', FORBIDDEN: 'no-editing' }
}

const IDS = {
  TITLE_DESCRIPTION: 'pcs-edit-section-title-description',
  ADD_TITLE_DESCRIPTION: 'pcs-edit-section-add-title-description',
  DIVIDER: 'pcs-edit-section-divider',
  PRONUNCIATION: 'pcs-edit-section-title-pronunciation',
  ARIA_EDIT_PROTECTED: 'pcs-edit-section-aria-protected',
  ARIA_EDIT_NORMAL: 'pcs-edit-section-aria-normal'
}

const DATA_ATTRIBUTE = {
  SECTION_INDEX: 'data-id',
  ACTION: 'data-action',
  PRONUNCIATION_URL: 'data-pronunciation-url',
  DESCRIPTION_SOURCE: 'data-description-source',
  WIKIDATA_ENTITY_ID: 'data-wikdata-entity-id'
}
const ACTION_EDIT_SECTION = 'edit_section'
const ACTION_TITLE_PRONUNCIATION = 'title_pronunciation'
const ACTION_ADD_TITLE_DESCRIPTION = 'add_title_description'

/**
 * Enables edit buttons to be shown (and which ones: protected or regular).
 * @param {!HTMLDocument} document
 * @param {?boolean} isEditable true if edit buttons should be shown
 * @param {?boolean} isProtected true if the protected edit buttons should be shown
 * @return {void}
 */
const setEditButtons = (document, isEditable = false, isProtected = false) => {
  const classList = document.documentElement.classList
  if (isEditable) {
    classList.remove(CLASS.PROTECTION.FORBIDDEN)
  } else {
    classList.add(CLASS.PROTECTION.FORBIDDEN)
  }
  if (isProtected) {
    classList.add(CLASS.PROTECTION.PROTECTED)
  } else {
    classList.remove(CLASS.PROTECTION.PROTECTED)
  }
}

/**
 * Sets appropriate label for VoiceOver to read for edit buttons. Defaults to normal, so only need to check if it's protected.
 * @param {!HTMLDocument} document
 * @return {void}
 */
const setARIAEditButtons = document => {
  if (document.documentElement.classList.contains(CLASS.PROTECTION.PROTECTED)) {
    Array.from(document.getElementsByClassName(CLASS.LINK)).forEach(link => link.setAttribute(ARIA.LABELED_BY, IDS.ARIA_EDIT_PROTECTED))
  }
}

/**
 * @param {!Document} document
 * @param {!number} index The zero-based index of the section.
 * @param {!string} href The href for the link
 * @return {!HTMLAnchorElement}
 */
const newEditSectionLink = (document, index, href = '') => {
  const link = document.createElement('a')
  link.href = href
  link.setAttribute(DATA_ATTRIBUTE.SECTION_INDEX, index)
  link.setAttribute(DATA_ATTRIBUTE.ACTION, ACTION_EDIT_SECTION)
  link.setAttribute(ARIA.LABELED_BY, IDS.ARIA_EDIT_NORMAL)
  link.classList.add(CLASS.LINK)
  return link
}

/**
 * @param {!Document} document
 * @param {!number} index The zero-based index of the section.
 * @param {!HTMLElement} link The link element
 * @param {?string} normalAriaLabel
 * @param {?string} protectedAriaLabel
 * @return {!HTMLSpanElement}
 */
const newEditSectionButton = (document, index, link, normalAriaLabel, protectedAriaLabel) => {
  const container = document.createElement('span')
  container.classList.add(CLASS.LINK_CONTAINER)

  if (document.getElementById(IDS.ARIA_EDIT_NORMAL) === null && normalAriaLabel) {
    const ariaDescriptionNormal = document.createElement('span')
    ariaDescriptionNormal.setAttribute('id', IDS.ARIA_EDIT_NORMAL)
    ariaDescriptionNormal.setAttribute(ARIA.LABEL, normalAriaLabel)
    container.appendChild(ariaDescriptionNormal)
  }

  if (document.getElementById(IDS.ARIA_EDIT_PROTECTED) === null && protectedAriaLabel) {
    const ariaDescriptionProtected = document.createElement('span')
    ariaDescriptionProtected.setAttribute('id', IDS.ARIA_EDIT_PROTECTED)
    ariaDescriptionProtected.setAttribute(ARIA.LABEL, protectedAriaLabel)
    container.appendChild(ariaDescriptionProtected)
  }

  let actualLink = link
  if (!actualLink) {
    actualLink = newEditSectionLink(document, index)
  }
  /* DOM sink status: safe - content transform with no user interference */
  container.appendChild(actualLink)

  return container
}

/**
 * @param {!Document} document
 * @param {!number} index The zero-based index of the section.
 * @return {!HTMLDivElement}
 */
const newEditSectionWrapper = (document, index) => {
  const element = document.createElement('div')
  element.classList.add(CLASS.SECTION_HEADER)
  element.classList.add('v2')
  return element
}

/**
 * @param {!HTMLDivElement} wrapper
 * @param {!HTMLElement} header The header element.
 * @return {void}
 */
const appendEditSectionHeader = (wrapper, header) => {
  header.classList.add(CLASS.TITLE)
  /* DOM sink status: safe - content transform with no user interference */
  wrapper.appendChild(header)
}

/**
 * @param {!Document} document
 * @param {!number} index The zero-based index of the section.
 * @param {!number} level The *one-based* header or table of contents level.
 * @param {?string} titleHTML Title of this section header.
 * @return {!HTMLElement}
 */
const newEditSectionHeader = (document, index, level, titleHTML) => {

  const element = newEditSectionWrapper(document, index)
  const title = document.createElement(`h${level}`)
  /* DOM sink status: safe - Displaytitle is sanitized in CoreParserHooks::displaytitle by MW
    OBS: if titleHTML is escaped it will cause a regression of T242028 */
  title.innerHTML = titleHTML || ''
  title.setAttribute(DATA_ATTRIBUTE.SECTION_INDEX, index)
  appendEditSectionHeader(element, title)
  return element
}

/**
 * Elements needed to show or add page title description.
 * @param {!Document} document
 * @param {?string} titleDescription Page title description.
 * @param {?string} titleDescriptionSource
 * @param {?string} wikidataEntityID
 * @param {?string} addTitleDescriptionString Localized string e.g. 'Add title description'.
 * @param {?boolean} isTitleDescriptionEditable Whether title description is editable.
 * @return {?HTMLElement}
 */
const titleDescriptionElements = (document, titleDescription, titleDescriptionSource, wikidataEntityID, addTitleDescriptionString,
  isTitleDescriptionEditable) => {
  const descriptionExists = titleDescription !== undefined && titleDescription.length > 0
  if (descriptionExists) {
    const p = document.createElement('p')
    p.setAttribute(DATA_ATTRIBUTE.DESCRIPTION_SOURCE, titleDescriptionSource)
    p.setAttribute(DATA_ATTRIBUTE.WIKIDATA_ENTITY_ID, wikidataEntityID)
    p.id = IDS.TITLE_DESCRIPTION
    p.innerHTML = titleDescription
    return p
  }
  if (isTitleDescriptionEditable) {
    const a = document.createElement('a')
    a.href = '#'
    a.setAttribute(DATA_ATTRIBUTE.ACTION, ACTION_ADD_TITLE_DESCRIPTION)
    const p = document.createElement('p')
    p.id = IDS.ADD_TITLE_DESCRIPTION
    p.innerHTML = addTitleDescriptionString
    a.appendChild(p)
    return a
  }
  return null
}

/**
 * Adds page title, description, and optional pronunciation. The description can be editable.
 * @param {!Document} document
 * @param {?string} pageDisplayTitle Page display title.
 * @param {?string} titleDescription Page title description.
 * @param {?string} titleDescriptionSource Page title description source - "central" or "local".
 * @param {?string} wikidataEntityID wikidata entity ID
 * @param {?string} addTitleDescriptionString Localized string e.g. 'Add title description'.
 * @param {?boolean} isTitleDescriptionEditable Whether title description is editable.
 * @param {?string} pronunciationURL URL for the pronunciation - will show the speaker when provided.
 * @return {!HTMLElement}
 */
const newPageHeader = (document, pageDisplayTitle, titleDescription, titleDescriptionSource, wikidataEntityID,
  addTitleDescriptionString, isTitleDescriptionEditable, pronunciationURL) => {

  const container = document.createDocumentFragment()

  const header = newEditSectionHeader(document, 0, 1, pageDisplayTitle)

  if (pronunciationURL) {
    const a = document.createElement('a')
    a.setAttribute(DATA_ATTRIBUTE.ACTION, ACTION_TITLE_PRONUNCIATION)
    a.setAttribute(DATA_ATTRIBUTE.PRONUNCIATION_URL, pronunciationURL)
    a.id = IDS.PRONUNCIATION
    header.querySelector('h1').appendChild(a)
  }

  container.appendChild(header)

  const descriptionElements = titleDescriptionElements(document, titleDescription,
    titleDescriptionSource, wikidataEntityID, addTitleDescriptionString,
    isTitleDescriptionEditable)

  if (descriptionElements) {
    container.appendChild(descriptionElements)
  }

  const divider = document.createElement('hr')
  divider.id = IDS.DIVIDER
  container.appendChild(divider)

  return container
}

export default {
  appendEditSectionHeader,
  CLASS,
  IDS,
  DATA_ATTRIBUTE,
  setEditButtons,
  setARIAEditButtons,
  newEditSectionHeader,
  newEditSectionButton,
  newEditSectionWrapper,
  newEditSectionLink,
  newPageHeader
}
