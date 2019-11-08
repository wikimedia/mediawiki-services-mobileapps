import './EditTransform.css'

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
  PRONUNCIATION: 'pcs-edit-section-title-pronunciation'
}

const DATA_ATTRIBUTE = { SECTION_INDEX: 'data-id', ACTION: 'data-action' }
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
  link.classList.add(CLASS.LINK)
  return link
}

/**
 * @param {!Document} document
 * @param {!number} index The zero-based index of the section.
 * @param {!HTMLElement} link The link element
 * @return {!HTMLSpanElement}
 */
const newEditSectionButton = (document, index, link) => {
  const container = document.createElement('span')
  container.classList.add(CLASS.LINK_CONTAINER)

  let actualLink = link
  if (!actualLink) {
    actualLink = newEditSectionLink(document, index)
  }
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
  element.className = CLASS.SECTION_HEADER
  return element
}

/**
 * @param {!HTMLDivElement} wrapper
 * @param {!HTMLElement} header The header element.
 * @return {void}
 */
const appendEditSectionHeader = (wrapper, header) => {
  header.className = CLASS.TITLE
  wrapper.appendChild(header)
}

/**
 * As a client, you may wish to set the ID attribute.
 * @param {!Document} document
 * @param {!number} index The zero-based index of the section.
 * @param {!number} level The *one-based* header or table of contents level.
 * @param {?string} titleHTML Title of this section header.
 * @param {?boolean} showEditPencil Whether to show the "edit" pencil (default is true).
 * @return {!HTMLElement}
 */
const newEditSectionHeader = (document, index, level, titleHTML, showEditPencil = true) => {

  const element = newEditSectionWrapper(document, index)
  const title = document.createElement(`h${level}`)
  title.innerHTML = titleHTML || ''
  title.setAttribute(DATA_ATTRIBUTE.SECTION_INDEX, index)
  appendEditSectionHeader(element, title)

  if (showEditPencil) {
    const button = newEditSectionButton(document, index)
    element.appendChild(button)
  }
  return element
}

/**
 * Elements needed to show or add page title description.
 * @param {!Document} document
 * @param {?string} titleDescription Page title description.
 * @param {?string} addTitleDescriptionString Localized string e.g. 'Add title description'.
 * @param {?boolean} isTitleDescriptionEditable Whether title description is editable.
 * @return {?HTMLElement}
 */
const titleDescriptionElements = (document, titleDescription, addTitleDescriptionString,
  isTitleDescriptionEditable) => {
  const descriptionExists = titleDescription !== undefined && titleDescription.length > 0
  if (descriptionExists) {
    const p = document.createElement('p')
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
 * Lead section header is a special case as it needs to show page title and description too,
 * and in addition to the lead edit pencil, the description can also be editable.
 * As a client, you may wish to set the ID attribute.
 * @param {!Document} document
 * @param {?string} pageDisplayTitle Page display title.
 * @param {?string} titleDescription Page title description.
 * @param {?string} addTitleDescriptionString Localized string e.g. 'Add title description'.
 * @param {?boolean} isTitleDescriptionEditable Whether title description is editable.
 * @param {?boolean} showEditPencil Whether to show the "edit" pencil (default is true).
 * @param {?boolean} hasPronunciation Whether to show pronunciation speaker icon (default is false).
 * @return {!HTMLElement}
 */
const newEditLeadSectionHeader = (document, pageDisplayTitle, titleDescription,
  addTitleDescriptionString, isTitleDescriptionEditable, showEditPencil = true,
  hasPronunciation = false) => {

  const container = document.createDocumentFragment()

  const header = newEditSectionHeader(document, 0, 1, pageDisplayTitle, showEditPencil)

  if (hasPronunciation) {
    const a = document.createElement('a')
    a.setAttribute(DATA_ATTRIBUTE.ACTION, ACTION_TITLE_PRONUNCIATION)
    a.id = IDS.PRONUNCIATION
    header.querySelector('h1').appendChild(a)
  }

  container.appendChild(header)

  const descriptionElements = titleDescriptionElements(document, titleDescription,
    addTitleDescriptionString, isTitleDescriptionEditable)

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
  ADD_TITLE_DESCRIPTION: IDS.ADD_TITLE_DESCRIPTION,
  setEditButtons,
  newEditSectionButton,
  newEditSectionHeader,
  newEditSectionWrapper,
  newEditLeadSectionHeader,
  newEditSectionLink
}