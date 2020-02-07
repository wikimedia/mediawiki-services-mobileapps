import SectionUtilities from '../../transform/SectionUtilities'


const setHidden = (sectionId, hidden) => {
  if (!document) {
    return;
  } 
  SectionUtilities.setHidden(document, sectionId, hidden)
}

export default {
  getOffsets: SectionUtilities.getSectionOffsets,
  setHidden
}