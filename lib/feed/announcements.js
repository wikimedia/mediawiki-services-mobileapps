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

const buildAndroidAnnouncement = () => {
    return {
        id: buildId('ANDROID', ''),
        type: config.type,
        start_time: config.startTime,
        end_time: config.endTime,
        platforms: [ 'AndroidAppV2' ],
        text: config.buildAndroidBodyText(),
        image: config.imageUrl,
        image_height: config.imageHeight,
        action: {
            title: config.buttonLabel,
            url: config.androidDestinationUrl
        },
        caption_HTML: config.disclaimerHtml,
        countries: config.countries,
        // new optional fields:
        min_version: config.androidMinVersion,
        max_version: config.androidMaxVersion,
        beta: false,
        logged_in: true,
        reading_list_sync_enabled: true,
        negative_text: config.negativeButtonLabel
    };
};

function getActiveAnnouncements() {
    return [ buildAndroidAnnouncement() ];
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
        // eslint-disable-next-line multiline-ternary
        announce: isActive(domain, new Date())
            ? getActiveAnnouncements() : []
    };
}


module.exports = {
    getAnnouncements,
    testing: {
        buildId,
        buildAndroidAnnouncement,
        // buildIosAnnouncement,
        getActiveAnnouncements,
        hasEnded
    }
};
