import SectionUtilities from '../../transform/SectionUtilities'

/**
 * Hide or unhide a section.
 * @param {!string} sectionId
 * @param {?boolean} hidden
 * @return {void}
 */
const setHidden = (sectionId, hidden) => {
  if (!document) {
    return
  }
  SectionUtilities.setHidden(document, sectionId, hidden)
}

export default {
  getOffsets: SectionUtilities.getSectionOffsets,
  setHidden
}