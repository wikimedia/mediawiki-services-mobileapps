import CollapseTable from '../../transform/CollapseTable'
import EditTransform from '../../transform/EditTransform'
import Polyfill from '../../transform/Polyfill'

const selectors = {
  addTitleDescription: `#${EditTransform.ADD_TITLE_DESCRIPTION}`,
  tableInfobox: `.${CollapseTable.CLASS.TABLE_INFOBOX}`,
  tableOther: `.${CollapseTable.CLASS.TABLE_OTHER}`,
  tableClose: `.${CollapseTable.CLASS.COLLAPSED_BOTTOM}`,
}

/**
 * Change user visible labels in the WebView.
 * @param {!{string}} localizedStrings a dictionary of localized strings {
 *   addTitleDescription, tableInfobox, tableOther, tableClose
 * }
 * @return {void}
 */
const localizeLabels = localizedStrings => {
  for (const [key, selector] of Object.entries(selectors)) {
    if (localizedStrings[key]) {
      const elements = Polyfill.querySelectorAll(document, selector)
      for (const element of elements) {
        element.innerHTML = localizedStrings[key]
      }
    }
  }
}

export default {
  localizeLabels
}