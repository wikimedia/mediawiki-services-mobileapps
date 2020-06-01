import './FooterContainer.less'

/**
 * Returns a fragment containing structural footer html which may be inserted where needed.
 * @param {!Document} document
 * @return {!DocumentFragment}
 */
const containerFragment = document => {
  const containerFragment = document.createDocumentFragment()
  const menuSection = document.createElement('section')
  menuSection.id = 'pcs-footer-container-menu'
  menuSection.className = 'pcs-footer-section'
  menuSection.innerHTML =
  `<h2 id='pcs-footer-container-menu-heading'></h2>
   <div id='pcs-footer-container-menu-items'></div>`
  /* DOM sink status: risk? */
  containerFragment.appendChild(menuSection)
  const readMoreSection = document.createElement('section')
  readMoreSection.id = 'pcs-footer-container-readmore'
  readMoreSection.className = 'pcs-footer-section'
  readMoreSection.style.display = 'none'
  readMoreSection.innerHTML =
  `<h2 id='pcs-footer-container-readmore-heading'></h2>
   <div id='pcs-footer-container-readmore-pages'></div>`
  /* DOM sink status: risk? */
  containerFragment.appendChild(readMoreSection)
  const legalSection = document.createElement('section')
  legalSection.id = 'pcs-footer-container-legal'
  /* DOM sink status: risk? */
  containerFragment.appendChild(legalSection)
  return containerFragment
}

/**
 * Indicates whether container is has already been added.
 * @param {!Document} document
 * @return {boolean}
 */
const isContainerAttached = document => Boolean(document.querySelector('#pcs-footer-container'))

export default {
  containerFragment,
  isContainerAttached // todo: rename isAttached()?
}
