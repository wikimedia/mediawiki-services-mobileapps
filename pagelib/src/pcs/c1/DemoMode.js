import Footer from './Footer'

/**
 * Add the page footer
 * @param {!URL} url
 * @return {void}
 */
const addFooter = url => {
  const parts = url.pathname.split('v1/page/mobile-html/')
  const baseURL = `${url.protocol}//${url.host}${parts[0]}v1`
  const title = parts[1]
  Footer.add({
    version: '2',
    title,
    menu: {
      items: [Footer.MenuItemType.languages,
        Footer.MenuItemType.lastEdited,
        Footer.MenuItemType.pageIssues,
        Footer.MenuItemType.disambiguation,
        Footer.MenuItemType.talkPage
      ],
      fragment: 'pcs-menu',
      editedDaysAgo: 3 // hard-coded for demo for now
    },
    readMore: {
      itemCount: 3,
      baseURL,
      fragment: 'pcs-read-more'
    }
  })
}

export default {
  addFooter
}