'use strict';

const config = require('../../etc/feed/announcements');

/**
 * Builds the body text for iOS. Note: HTML is not supported by iOS clients!
 * @param {!object} vars an Object holding the variables for text substitution
 */
const buildIosBodyText = (vars) => {
    return config.buildBaseBodyText(vars);
};

/**
 * Builds the body text for Android. Note: Android wants HTML here.
 * @param {!object} vars an Object holding the variables for text substitution
 */
const buildAndroidBodyText = (vars) => {
    return config.buildBaseBodyText(vars).replace(/\n/g, '<br>');
};

/**
 * @param {!string} os operating system, uppercase ('IOS' or 'ANDROID')
 * @param {!string} countryCode country code, uppercase (e.g. 'US', 'CA')
 */
const buildId = (os, countryCode) => {
    return `${config.idPrefix}${config.type.toUpperCase()}${os}${countryCode}`;
};

const buildIosAnnouncement = (variant) => {
    // Notes: for iOS 'text' and 'action.title': HTML is not supported.
    // iOS uses image_url instead of the image Android uses.
    // iOS caption_HTML should be wrapped in <p> tag.
    return {
        id: buildId('IOS', variant.countryCode),
        type: config.type,
        start_time: config.startTime,
        end_time: config.endTime,
        platforms: [ 'iOSApp' ],
        text: buildIosBodyText(variant),
        // image_url: config.imageUrl,
        action: {
            title: config.buttonLabel,
            url: config.iosDestinationUrl
        },
        caption_HTML: `<p>${config.disclaimerHtml}</p>`,
        countries: [ variant.countryCode ]
    };
};

const buildAndroidAnnouncement = (variant) => {
    return {
        id: buildId('ANDROID', variant.countryCode),
        type: config.type,
        start_time: config.startTime,
        end_time: config.endTime,
        platforms: [ 'AndroidApp' ],
        text: buildAndroidBodyText(variant),
        // image: config.imageUrl,
        action: {
            title: config.buttonLabel,
            url: config.androidDestinationUrl
        },
        caption_HTML: config.disclaimerHtml,
        countries: [ variant.countryCode ]
    };
};

function getActiveAnnouncements() {
    const results = [];
    config.countryVariants.forEach(variant => results.push(buildAndroidAnnouncement(variant)));
    config.countryVariants.forEach(variant => results.push(buildIosAnnouncement(variant)));
    return results;
}

function isActiveWiki(domain) {
    return domain === config.activeWiki;
}

function isEnBetaClusterDomain(domain) {
    // treat English beta cluster subdomain as active for easier testing
    // since it only has a few subdomains
    return domain === 'en.wikipedia.beta.wmflabs.org';
}

function getAnnouncements(domain) {
    return {
        // eslint-disable-next-line multiline-ternary
        announce: isActiveWiki(domain) || isEnBetaClusterDomain(domain)
            ? getActiveAnnouncements() : []
    };
}


module.exports = {
    getAnnouncements,
    testing: {
        buildId,
        buildAndroidAnnouncement,
        buildIosAnnouncement,
        getActiveAnnouncements
    }
};
