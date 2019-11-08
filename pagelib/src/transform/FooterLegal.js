import './FooterLegal.css'

/**
 * @typedef {function} FooterLegalClickCallback
 * @return {void}
 */

/**
  * @typedef {function} FooterBrowserClickCallback
  * @return {void}
  */

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
  licenseLinkClickHandler, viewInBrowserString, browserLinkClickHandler) => {
  // todo: don't manipulate the selector. The client can make this an ID if they want it to be.
  const container = content.querySelector(`#${containerID}`)
  const licenseStringHalves = licenseString.split('$1')

  container.innerHTML =
  `<div class='pcs-footer-legal-contents'>
    <hr class='pcs-footer-legal-divider'>
    <span class='pcs-footer-legal-license'>
      ${licenseStringHalves[0]}
      <a class='pcs-footer-legal-license-link'>
        ${licenseSubstitutionString}
      </a>
      ${licenseStringHalves[1]}
      <br>
      <div class="pcs-footer-browser">
        <a class='pcs-footer-browser-link'>
          ${viewInBrowserString}
        </a>
      </div>
    </span>
  </div>`

  container.querySelector('.pcs-footer-legal-license-link')
    .addEventListener('click', () => {
      licenseLinkClickHandler()
    })

  container.querySelector('.pcs-footer-browser-link')
    .addEventListener('click', () => {
      browserLinkClickHandler()
    })
}

export default {
  add
}