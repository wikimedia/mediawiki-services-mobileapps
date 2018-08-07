'use strict';

const config = require('../../etc/feed/announcements');
const HTTPError = require('../util').HTTPError;

function getLatestAppVersionAnnouncements(domain) {
    return config.variantsLatestAppVersion
    .filter(variant => variant.domain === domain)
    .map(variant => (config.androidAnnouncementLatestAppVersion(variant)));
}

function getUpdateAppVersionAnnouncements(domain) {
    return config.variantsUpdateAppVersion
    .filter(variant => variant.domain === domain)
    .map(variant => (config.androidAnnouncementUpdateAppVersion(variant)));
}

function getActiveAnnouncements(domain) {
    return getLatestAppVersionAnnouncements(domain).concat(
        getUpdateAppVersionAnnouncements(domain));
}

function isActiveWiki(domain) {
    return config.activeWikis.includes(domain);
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
    return isActiveWiki(domain) && !hasEnded(now);
}

function getAnnouncements(domain) {
    return {
        announce: isActive(domain, new Date()) ? getActiveAnnouncements(domain) : []
    };
}

module.exports = {
    getAnnouncements,
    testing: {
        getActiveAnnouncements,
        hasEnded
    }
};
