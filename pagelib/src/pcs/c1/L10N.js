import CollapseTable from '../../transform/CollapseTable'
import EditTransform from '../../transform/EditTransform'
import Polyfill from '../../transform/Polyfill'
import HTMLUtil from '../../transform/HTMLUtilities'

const selectors = {
  addTitleDescription: `#${EditTransform.IDS.ADD_TITLE_DESCRIPTION}`,
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
        /* DOM sink status: sanitized localizedStrings are client inputs,
          which should be in full control by the apps */
        element.textContent = HTMLUtil.escape(localizedStrings[key])
      }
    }
  }
}

export default {
  localizeLabels
}