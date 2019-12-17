import './FooterContainer.css'

/**
 * Returns a fragment containing structural footer html which may be inserted where needed.
 * @param {!Document} document
 * @param {!Object.<any>} fragments object containing fragments names for each section
 * @return {!DocumentFragment}
 */
const containerFragment = (document, fragments) => {
  const containerFragment = document.createDocumentFragment()
  const menuSection = document.createElement('section')
  menuSection.id = 'pcs-footer-container-menu'
  menuSection.className = 'pcs-footer-section'
  /* DOM sink status: risk? - fragments are controlled by the client */
  menuSection.innerHTML =
  `<h2 id='pcs-footer-container-menu-heading'></h2>
   <a name=${fragments && fragments.menu}></a>
   <div id='pcs-footer-container-menu-items'></div>`
  /* DOM sink status: risk? */
  containerFragment.appendChild(menuSection)
  const readMoreSection = document.createElement('section')
  readMoreSection.id = 'pcs-footer-container-readmore'
  readMoreSection.className = 'pcs-footer-section'
  readMoreSection.style.display = 'none';
  /* DOM sink status: risk? - fragments are controlled by the client */
  readMoreSection.innerHTML =
  `<h2 id='pcs-footer-container-readmore-heading'></h2>
   <a name=${fragments && fragments.readmore}></a>
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