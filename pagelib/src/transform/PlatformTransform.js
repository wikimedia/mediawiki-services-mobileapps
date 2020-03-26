const CLASS_PREFIX = 'pcs-platform-'
const VERSION_PREFIX = 'pcs-v'
const CLASS = { ANDROID: `${CLASS_PREFIX}android`, IOS:  `${CLASS_PREFIX}ios` }

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
  if (!document || !document.documentElement) {
    return
  }
  document.documentElement.classList.add(platform)
}


/**
 * Configures the page for a given version. If the client passes in an old version, ensure
 * features that would not work for that client are hidden.
 * @param {!HTMLDocument} document
 * @param {?string} version callback
 * @return {void}
 */
const setVersion = (document, version) => {
  if (!document || !document.documentElement) {
    return
  }
  // <IMPORTANT>
  // When new versions are added here, update the profile version for mobile-html in
  // lib/mobileutil in the mobileapps repo to match the latest version and add
  // information about new features in docs/pcs.md. Only major and minor versions are
  // supported.
  // </IMPORTANT>
  const currentVersion = 2
  const supportedVersion = version || 1
  // Add every supported version class to the documentElement
  for (let version = 1; version <= currentVersion; version++) {
    document.documentElement.classList.add(VERSION_PREFIX + version)
    if (version === supportedVersion) {
      break
    }
  }
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
  CLASS_PREFIX,
  classify,
  setPlatform,
  setVersion
}