import './FooterReadMore.css'

/**
 * @typedef {function} TitlesShownHandler
 * @param {!Array.<string>} titles
 * @return {void}
 */

/**
 * Display fetched read more pages.
 * @typedef {function} ShowReadMorePagesHandler
 * @param {!Array.<object>} pages
 * @param {!string} containerID
 * @param {!TitlesShownHandler} titlesShownHandler
 * @param {!Document} document
 * @return {void}
 */

/**
 * Removes parenthetical enclosures from string.
 * @param {!string} string
 * @param {!string} opener
 * @param {!string} closer
 * @return {!string}
 */
const safelyRemoveEnclosures = (string, opener, closer) => {
  const enclosureRegex = new RegExp(`\\s?[${opener}][^${opener}${closer}]+[${closer}]`, 'g')
  let counter = 0
  const safeMaxTries = 30
  let stringToClean = string
  let previousString = ''
  do {
    previousString = stringToClean
    stringToClean = stringToClean.replace(enclosureRegex, '')
    counter++
  } while (previousString !== stringToClean && counter < safeMaxTries)
  return stringToClean
}

/**
 * Removes '(...)' and '/.../' parenthetical enclosures from string.
 * @param {!string} string
 * @return {!string}
 */
const cleanExtract = string => {
  let stringToClean = string
  stringToClean = safelyRemoveEnclosures(stringToClean, '(', ')')
  stringToClean = safelyRemoveEnclosures(stringToClean, '/', '/')
  return stringToClean
}

/**
 * Read more page model.
 */
class ReadMorePage {
  /**
   * ReadMorePage constructor.
   * @param {!string} title
   * @param {!string} displayTitle
   * @param {?string} thumbnail
   * @param {?string} description
   * @param {?string} extract
   */
  constructor(title, displayTitle, thumbnail, description, extract) {
    this.title = title
    this.displayTitle = displayTitle
    this.thumbnail = thumbnail
    this.description = description
    this.extract = extract
  }
}

/**
 * Makes document fragment for a read more page.
 * @param {!ReadMorePage} readMorePage
 * @param {!number} index
 * @param {!Document} document
 * @return {!DocumentFragment}
 */
const documentFragmentForReadMorePage = (readMorePage, index, document) => {
  const outerAnchorContainer = document.createElement('a')
  outerAnchorContainer.id = index
  outerAnchorContainer.className = 'pcs-footer-readmore-page'

  const hasImage = readMorePage.thumbnail && readMorePage.thumbnail.source
  if (hasImage) {
    const image = document.createElement('div')
    image.style.backgroundImage = `url(${readMorePage.thumbnail.source})`
    image.classList.add('pcs-footer-readmore-page-image')
    outerAnchorContainer.appendChild(image)
  }

  const innerDivContainer = document.createElement('div')
  innerDivContainer.classList.add('pcs-footer-readmore-page-container')
  outerAnchorContainer.appendChild(innerDivContainer)
  outerAnchorContainer.href = `./${encodeURI(readMorePage.title)}?event-logging-label=read-more`

  let titleToShow
  if (readMorePage.displayTitle) {
    titleToShow = readMorePage.displayTitle
  } else if (readMorePage.title) {
    titleToShow = readMorePage.title
  }

  if (titleToShow) {
    const title = document.createElement('div')
    title.id = index
    title.className = 'pcs-footer-readmore-page-title'
    title.innerHTML = titleToShow.replace(/_/g, ' ')
    outerAnchorContainer.title = readMorePage.title.replace(/_/g, ' ')
    innerDivContainer.appendChild(title)
  }

  let description
  if (readMorePage.description) {
    description = readMorePage.description
  }
  if ((!description || description.length < 10) && readMorePage.extract) {
    description = cleanExtract(readMorePage.extract)
  }
  if (description) {
    const descriptionEl = document.createElement('div')
    descriptionEl.id = index
    descriptionEl.className = 'pcs-footer-readmore-page-description'
    descriptionEl.innerHTML = description
    innerDivContainer.appendChild(descriptionEl)
  }

  return document.createDocumentFragment().appendChild(outerAnchorContainer)
}

// eslint-disable-next-line valid-jsdoc
/**
 * @type {ShowReadMorePagesHandler}
 */
const showReadMorePages = (pages, containerID, titlesShownHandler,
  document) => {
  const shownTitles = []
  const container = document.getElementById(containerID)
  pages.forEach((page, index) => {
    const title = page.titles.normalized
    shownTitles.push(title)
    const pageModel = new ReadMorePage(title, page.titles.display, page.thumbnail,
      page.description, page.extract)
    const pageFragment =
      documentFragmentForReadMorePage(pageModel, index, document)
    container.appendChild(pageFragment)
  })
  titlesShownHandler(shownTitles)
}

/**
 * URL for retrieving 'Read more' pages for a given title.
 * Leave 'baseURL' null if you don't need to deal with proxying.
 * @param {!string} title
 * @param {!number} count Number of `Read more` items to fetch for this title
 * @param {?string} baseURL
 * @return {!string}
 */
const readMoreQueryURL = (title, count, baseURL) =>
  `${baseURL || ''}/page/related/${title}`

/**
 * Fetch error handler.
 * @param {!string} statusText
 * @return {void}
 */
const fetchErrorHandler = statusText => {
  // TODO: figure out if we want to hide the 'Read more' header in cases when fetch fails.
  console.log(`statusText = ${statusText}`) // eslint-disable-line no-console
}

/**
 * Fetches 'Read more' pages.
 * @param {!string} title
 * @param {!number} count
 * @param {!string} containerID
 * @param {?string} baseURL
 * @param {!ShowReadMorePagesHandler} showReadMorePagesHandler
 * @param {!TitlesShownHandler} titlesShownHandler
 * @param {!Document} document
 * @return {void}
 */
const fetchReadMore = (title, count, containerID, baseURL, showReadMorePagesHandler,
  titlesShownHandler, document) => {
  const xhr = new XMLHttpRequest() // eslint-disable-line no-undef
  xhr.open('GET', readMoreQueryURL(title, count, baseURL), true)
  xhr.onload = () => {
    if (xhr.readyState === XMLHttpRequest.DONE) { // eslint-disable-line no-undef
      if (xhr.status === 200) {
        const pages = JSON.parse(xhr.responseText).pages
        let results
        if (pages.length > count) {
          const rand = Math.floor(Math.random() * Math.floor(pages.length - count))
          results = pages.slice(rand, rand + count)
        } else {
          results = pages
        }
        showReadMorePagesHandler(
          results,
          containerID,
          titlesShownHandler,
          document
        )
      } else {
        fetchErrorHandler(xhr.statusText)
      }
    }
  }
  xhr.onerror = () => fetchErrorHandler(xhr.statusText)
  try {
    xhr.send()
  } catch (error) {
    fetchErrorHandler(error.toString())
  }
}

/**
 * Adds 'Read more' for 'title' to 'containerID' element.
 * Leave 'baseURL' null if you don't need to deal with proxying.
 * @param {!string} title
 * @param {!number} count
 * @param {!string} containerID
 * @param {?string} baseURL
 * @param {!TitlesShownHandler} titlesShownHandler
 * @param {!Document} document
 * @return {void}
 */
const add = (title, count, containerID, baseURL, titlesShownHandler,
  document) => {
  fetchReadMore(
    title,
    count,
    containerID,
    baseURL,
    showReadMorePages,
    titlesShownHandler,
    document
  )
}

/**
 * Sets heading element string.
 * @param {!string} headingString
 * @param {!string} headingID
 * @param {!Document} document
 * @return {void}
 */
const setHeading = (headingString, headingID, document) => {
  const headingElement = document.getElementById(headingID)
  headingElement.innerText = headingString
  headingElement.title = headingString
}

export default {
  add,
  setHeading,
  test: {
    cleanExtract,
    safelyRemoveEnclosures
  }
}