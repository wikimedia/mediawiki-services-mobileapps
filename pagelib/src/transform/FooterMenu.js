import './FooterMenu.less'
import CollectionUtilities from './CollectionUtilities'
import HTMLUtil from '../transform/HTMLUtilities'

/**
 * @typedef {function} FooterMenuItemClickCallback
 * @param {!Array.<string>} payload Important - should return empty array if no payload strings.
 * @return {void}
 */

/**
 * @typedef {string} MenuItemType
 */

/**
 * Type representing kinds of menu items.
 * IMPORTANT: Don't change these values without considering it a breaking change.
 * Existing clients rely on using the string values so that they are serializable.
 * @enum {MenuItemType}
 */
const MenuItemType = {
  lastEdited: 'lastEdited',
  pageIssues: 'pageIssues',
  disambiguation: 'disambiguation',
  coordinate: 'coordinate',
  talkPage: 'talkPage'
}

/**
 * Menu item model.
 */
class MenuItem {
  /**
   * MenuItem constructor.
   * @param {!string} title
   * @param {?string} subtitle
   * @param {!MenuItemType} itemType
   * @param {FooterMenuItemClickCallback} clickHandler
   */
  constructor(title, subtitle, itemType, clickHandler) {
    this.title = title
    this.subtitle = subtitle
    this.itemType = itemType
    this.clickHandler = clickHandler
    this.payload = []
  }

  /**
   * Returns icon CSS class for this menu item based on its type.
   * @return {!string}
   */
  iconClass() {
    switch (this.itemType) {
    case MenuItemType.lastEdited:
      return 'pcs-footer-menu-icon-last-edited'
    case MenuItemType.talkPage:
      return 'pcs-footer-menu-icon-talk-page'
    case MenuItemType.pageIssues:
      return 'pcs-footer-menu-icon-page-issues'
    case MenuItemType.disambiguation:
      return 'pcs-footer-menu-icon-disambiguation'
    case MenuItemType.coordinate:
      return 'pcs-footer-menu-icon-coordinate'
    default:
      return ''
    }
  }

  /**
   * Extracts array of page issues, disambiguation titles, etc from element.
   * @typedef {function} PayloadExtractor
   * @param {!Document} document
   * @param {?Element} element
   * @return {!Array.<string>} Return empty array if nothing is extracted
   */

  /**
   * Returns reference to function for extracting payload when this menu item is tapped.
   * @return {?PayloadExtractor}
   */
  payloadExtractor() {
    switch (this.itemType) {
    case MenuItemType.pageIssues:
      return CollectionUtilities.collectPageIssues
    case MenuItemType.disambiguation:
      return CollectionUtilities.collectHatnotes
    default:
      return undefined
    }
  }
}

/**
 * Makes document fragment for a menu item.
 * @param {!MenuItem} menuItem
 * @param {!Document} document
 * @return {!DocumentFragment}
 */
const documentFragmentForMenuItem = (menuItem, document) => {
  const item = document.createElement('div')
  item.className = 'pcs-footer-menu-item'
  item.role = 'menuitem'
  const containerAnchor = document.createElement('a')
  containerAnchor.addEventListener('click', () => {
    menuItem.clickHandler(menuItem.payload)
  })

  item.appendChild(containerAnchor)

  if (menuItem.title) {
    const title = document.createElement('div')
    title.className = 'pcs-footer-menu-item-title'
    /* DOM sink status: sanitized - headingString can be changed by clients */
    title.textContent = menuItem.title
    containerAnchor.title = menuItem.title
    containerAnchor.appendChild(title)
  }

  if (menuItem.subtitle) {
    const subtitle = document.createElement('div')
    subtitle.className = 'pcs-footer-menu-item-subtitle'
    /* DOM sink status: sanitized - headingString can be changed by clients */
    subtitle.textContent = menuItem.subtitle
    containerAnchor.appendChild(subtitle)
  }

  const iconClass = menuItem.iconClass()
  if (iconClass) {
    item.classList.add(iconClass)
  }

  return document.createDocumentFragment().appendChild(item)
}

/**
 * Adds a MenuItem to a container.
 * @param {!MenuItem} menuItem
 * @param {!string} containerID
 * @param {!Document} document
 * @return {void}
 */
const addItem = (menuItem, containerID, document) => {
  document.getElementById(containerID).appendChild(
    documentFragmentForMenuItem(menuItem, document)
  )
}

/**
 * Conditionally adds a MenuItem to a container.
 * @param {!string} title
 * @param {!string} subtitle
 * @param {!MenuItemType} itemType
 * @param {!string} containerID
 * @param {FooterMenuItemClickCallback} clickHandler
 * @param {!Document} document
 * @return {void}
 */
const maybeAddItem = (title, subtitle, itemType, containerID, clickHandler, document) => {
  if (title === '') {
    return
  }
  const item = new MenuItem(title, subtitle, itemType, clickHandler)

  // Items are not added if they have a payload extractor which fails to extract anything.
  const extractor = item.payloadExtractor()
  if (extractor) {
    item.payload = extractor(document)
    if (item.payload.length === 0) {
      return
    }
  }

  addItem(item, containerID, document)
}

/**
 * Sets heading element string.
 * @param {!string} headingString
 * @param {!string} headingID
 * @param {!Document} document
 * @return {void}
 */
const setHeading = (headingString, headingID, document) => {
  const headingElement = document.getElementById(headingID)
  /* DOM sink status: sanitized - headingString can be changed by clients */
  headingElement.textContent = headingString
  headingElement.title = HTMLUtil.escape(headingString)
}

export default {
  MenuItemType, // todo: rename to just ItemType?
  setHeading,
  maybeAddItem
}
