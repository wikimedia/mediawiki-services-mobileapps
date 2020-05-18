'use strict';

const MobileHTML = require('./MobileHTML');
const mRequestUtil = {};

/**
 * Convert raw string to valid MobileHTML.OutputMode, or a default if string is invalid
 * @param {!String} requestedOutputMode string that is possibly a MobileHTML output mode
 * @return {!MobileHTML.OutputMode} Valid output mode
 */
mRequestUtil.getOutputMode = (requestedOutputMode) => {
    const attemptedOutputMode = MobileHTML.OutputMode[requestedOutputMode];
    if (attemptedOutputMode !== undefined) {
        return attemptedOutputMode;
    } else {
        return mRequestUtil.defaultOutputModeForPOSTResponse;
    }
};

/**
 * Default output mode for when API requests do not provide a valid output mode.
 * Currently only used by getMobileHtmlFromPOST. Helpful with tests.
 * @returns {MobileHTML.OutputMode}
 */
mRequestUtil.defaultOutputModeForPOSTResponse = MobileHTML.OutputMode.editPreview;

module.exports = mRequestUtil;
