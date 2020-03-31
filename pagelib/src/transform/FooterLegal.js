import './FooterLegal.css'
import HTMLUtil from '../transform/HTMLUtilities'

/**
 * @typedef {function} FooterLegalClickCallback
 * @return {void}
 */

/**
  * @typedef {function} FooterBrowserClickCallback
  * @return {void}
  */

/**
 * @param {!string} licenseString
 * @param {?string} linkText
 * @return {!string}
 */
const buildLicenseHtml = (licenseString, linkText) => {
  const halves = licenseString.split('$1')
  /* DOM sink status: sanitized - content can be changed by users */
  return `${HTMLUtil.escape(halves[0])}<a class="external text" rel="mw:ExtLink" href="https://creativecommons.org/licenses/by-sa/3.0/">${HTMLUtil.escape(linkText)}</a>${HTMLUtil.escape(halves[1])}`
}

/**
 * Adds legal footer html to 'containerID' element.
 * @param {!Element} content
 * @param {?string} licenseString
 * @param {?string} licenseSubstitutionString
 * @param {!string} containerID
 * @param {!FooterLegalClickCallback} licenseLinkClickHandler
 * @param {!string} viewInBrowserString
 * @param {!FooterBrowserClickCallback} browserLinkClickHandler
 * @return {void}
 */
const add = (content, licenseString, licenseSubstitutionString, containerID,
  viewInBrowserString, browserLinkClickHandler) => {

  // todo: don't manipulate the selector. The client can make this an ID if they want it to be.
  const container = content.querySelector(`#${containerID}`)

  /* DOM sink status: sanitized - content can be changed by users */
  container.innerHTML =
  `<div class='pcs-footer-legal-contents'>
    <hr class='pcs-footer-legal-divider'>
    <span class='pcs-footer-legal-license'>
    ${buildLicenseHtml(licenseString, licenseSubstitutionString)}
    <br>
      <div class="pcs-footer-browser">
        <a class='pcs-footer-browser-link'>
          ${HTMLUtil.escape(viewInBrowserString)}
        </a>
      </div>
    </span>
  </div>`

  container.querySelector('.pcs-footer-browser-link')
    .addEventListener('click', () => {
      browserLinkClickHandler()
    })
}

export default {
  add
}