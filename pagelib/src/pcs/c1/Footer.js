import Banana from 'banana-i18n'
import FooterContainer from '../../transform/FooterContainer'
import FooterLegal from '../../transform/FooterLegal'
import FooterMenu from '../../transform/FooterMenu'
import FooterReadMore from '../../transform/FooterReadMore'

let handlers

/**
 * Sets up the interaction handlers for the footer.
 * @param {!{}} newHandlers an object with handlers for {
 *   titlesRetrieved, footerItemSelected, saveOtherPage, viewLicense, viewInBrowser
 * }
 * @return {void}
 */
const _connectHandlers = newHandlers => {
  handlers = newHandlers
}

/**
 * Note: T249541: pluralization with banana-i18 1.1.2 doesn't work if the zero case comes first
 * in the string.
 * @param {!Banana} banana
 * @param {?number} editedDaysAgo
 * @return {string}
 */
const _getPageLastEditedString = (banana, editedDaysAgo) => {
  if (editedDaysAgo === undefined || editedDaysAgo < 0) {
    return ''
  }

  try {
    let result = banana.i18n('page-last-edited', editedDaysAgo)

    if (result && result.includes('undefined')) {
      result = ''
    }

    return result
  } catch (err) {
    return ''
  }
}

const _getArticleTitleFromLocation = (location) => location.pathname.split('/page/mobile-html/')[1]

/**
 * Adds footer to the end of the document
 * @param {!Object.<any>} params parameters as follows
 *   {!map} menu
 *       {!array<string>} items menu items to add
 *   {!map} readMore
 *       {!number} itemCount number of read more items to add
 *       {!string} baseURL base url for RESTBase to fetch read more
 * @return {void}
 */
const add = params => {
  const { menu: { items: menuItems, editedDaysAgo },
    readMore: { itemCount: readMoreItemCount, baseURL: readMoreBaseURL } } = params

  // Add container
  if (FooterContainer.isContainerAttached(document) === false) {
    const pcs = document.getElementById('pcs')
    pcs.appendChild(FooterContainer.containerFragment(document))
  }

  /**
   * Callback for after i18n messages are loaded.
   * @param {!Banana} banana
   * @return {void}
   */
  const finish = banana => {
    // Add menu
    FooterMenu.setHeading(
      banana.i18n('article-about-title'),
      'pcs-footer-container-menu-heading',
      document
    )
    menuItems.forEach(item => {
      let title = ''
      let subtitle = ''
      switch (item) {
      case FooterMenu.MenuItemType.lastEdited:
        title = banana.i18n('page-edit-history')
        subtitle = _getPageLastEditedString(banana, editedDaysAgo)
        break
      case FooterMenu.MenuItemType.pageIssues:
        title = banana.i18n('page-issues')
        subtitle = banana.i18n('page-issues-subtitle')
        break
      case FooterMenu.MenuItemType.disambiguation:
        title = banana.i18n('page-similar-titles')
        break
      case FooterMenu.MenuItemType.coordinate:
        title = banana.i18n('page-location')
        break
      case FooterMenu.MenuItemType.talkPage:
        title = banana.i18n('page-talk-page')
        subtitle = banana.i18n('page-talk-page-subtitle')
        break
      default:
      }

      /**
       * @param {!map} payload menu item payload
       * @return {void}
       */
      const itemSelectionHandler = payload => {
        if (handlers) {
          handlers.footerItemSelected(item, payload)
        }
      }

      FooterMenu.maybeAddItem(
        title,
        subtitle,
        item,
        'pcs-footer-container-menu-items',
        itemSelectionHandler,
        document
      )
    })

    if (readMoreItemCount && readMoreItemCount > 0) {

      /**
       * @param {!list} titles article titles
       * @return {void}
       */
      const titlesShownHandler = titles => {
        if (handlers) {
          handlers.titlesRetrieved(titles)
        }
      }

      FooterReadMore.fetchAndAdd(
        _getArticleTitleFromLocation(window.location),
        banana.i18n('article-read-more-title'),
        readMoreItemCount,
        'pcs-footer-container-readmore',
        'pcs-footer-container-readmore-pages',
        readMoreBaseURL,
        titlesShownHandler,
        document
      )
    }

    /**
     * @return {void}
     */
    const viewInBrowserLinkClickHandler = () => {
      if (handlers) {
        handlers.viewInBrowser()
      }
    }

    FooterLegal.add(
      document,
      banana.i18n('license-footer-text'),
      banana.i18n('license-footer-name'),
      'pcs-footer-container-legal',
      banana.i18n('view-in-browser-footer-link'),
      viewInBrowserLinkClickHandler
    )

  }


  const xhr = new XMLHttpRequest() // eslint-disable-line no-undef
  const href = window.location.href || ''
  const index = href.indexOf('/page/mobile-html/') // hax
  const stringsBaseURL = index >= 0 ? href.slice(0, index) : ''
  const stringsURL = `${stringsBaseURL}/data/i18n/pcs`
  xhr.open('GET', stringsURL, true)
  const failsafeBanana = {
    i18n: message => message
  }
  xhr.onload = () => {
    let banana
    try {
      const response = JSON.parse(xhr.responseText)
      // default locale is returned in the response
      let locale = response && response.locale || 'en'
      // actual locale (with variant if applicable) is in the meta tag
      const localeMetaTag = document.head.querySelector('meta[property="pcs:locale"]')
      if (localeMetaTag) {
        const content = localeMetaTag.getAttribute('content')
        if (content) {
          locale = content
        }
      }
      banana = new Banana(locale)
      banana.load(response.messages)
    } catch (e) {
      banana = failsafeBanana
    }
    finish(banana)
  }
  xhr.onerror = () => {
    finish(failsafeBanana)
  }
  xhr.send()
}

export default {
  MenuItemType: FooterMenu.MenuItemType,
  add,
  // to be used internally or for unit testing only:
  _connectHandlers,
  _getPageLastEditedString
}