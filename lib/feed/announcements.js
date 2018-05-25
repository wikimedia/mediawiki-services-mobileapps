'use strict';

const config = require('../../etc/feed/announcements');
const HTTPError = require('../util').HTTPError;

/**
 * @param {!string} os operating system, uppercase ('IOS' or 'ANDROID')
 * @param {!string} countryCode country code, uppercase (e.g. 'US', 'CA')
 */
const buildId = (os, countryCode) => {
    return `${config.idPrefix}${config.type.toUpperCase()}${os}${countryCode}`;
};

const baseAnnouncement = {
    type: config.type,
    start_time: config.startTime,
    // end_time: config.endTime,
    action: {
        title: config.buttonLabel,
        url: config.callToActionUrl
    },
    countries: config.countries,
    // beta: true,
    logged_in: true,
    reading_list_sync_enabled: true,
    negative_text: config.negativeButtonLabel
};

const androidAnnouncement = Object.assign({
    id: buildId('ANDROID', ''),
    platforms: [ 'AndroidAppV2' ],
    end_time: config.endTimeAndroid,
    image: config.androidImageUrl,
    image_height: config.androidImageHeight,
    min_version: config.androidMinVersion,
    text: config.androidBodyText
}, baseAnnouncement);

const iosAnnouncement = Object.assign({
    id: buildId('IOS', ''),
    platforms: [ 'iOSApp' ],
    end_time: config.endTimeIOS,
    image_url: config.iosImageUrl,
    min_version: config.iosMinVersion,
    max_version: config.iosMaxVersion,
    text: config.iosBodyText
}, baseAnnouncement);


function getActiveAnnouncements() {
    return [ androidAnnouncement, iosAnnouncement ];
}

function isActiveWiki(domain) {
    return domain === config.activeWiki;
}

function isEnBetaClusterDomain(domain) {
    // treat English beta cluster subdomain as active for easier testing
    // since it only has a few subdomains
    return domain === 'en.wikipedia.beta.wmflabs.org';
}

function hasEnded(now) {
    const endDate = Date.parse(config.endTime);
    if (isNaN(endDate)) {
        throw new HTTPError({
            status: 500,
            type: 'config_error',
            title: 'invalid end date in announcements config',
            detail: config.endTime
        });
    }
    return now > endDate;
}

function isActive(domain, now) {
    return (isActiveWiki(domain) || isEnBetaClusterDomain(domain))
        && !hasEnded(now);
}

function getAnnouncements(domain) {
    return {
        announce: isActive(domain, new Date()) ? getActiveAnnouncements() : []
    };
}


module.exports = {
    getAnnouncements,
    testing: {
        buildId,
        androidAnnouncement,
        iosAnnouncement,
        getActiveAnnouncements,
        hasEnded
    }
};
