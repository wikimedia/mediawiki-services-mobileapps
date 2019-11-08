const CLASS = { ANDROID: 'pcs-platform-android', IOS:  'pcs-platform-ios' }

// Regular expressions from https://phabricator.wikimedia.org/diffusion/EMFR/browse/master/resources/mobile.startup/browser.js;c89f371ea9e789d7e1a827ddfec7c8028a549c12.
/**
 * @param {!Window} window
 * @return {!boolean} true if the user agent is Android, false otherwise.
 */
const isAndroid = window => /android/i.test(window.navigator.userAgent)

/**
 * @param {!Window} window
 * @return {!boolean} true if the user agent is iOS, false otherwise.
 */
const isIOs = window => /ipad|iphone|ipod/i.test(window.navigator.userAgent)

/**
 * @param {!HTMLDocument} document
 * @param {!string} platform one of the values in CLASS
 * @return {void}
 */
const setPlatform = (document, platform) => {
  document.documentElement.classList.add(platform)
}

/**
 * @param {!Window} window
 * @return {void}
 */
const classify = window => {
  const html = window.document.documentElement
  if (isAndroid(window)) { html.classList.add(CLASS.ANDROID) }
  if (isIOs(window)) { html.classList.add(CLASS.IOS) }
}

export default {
  CLASS,
  classify,
  setPlatform
}