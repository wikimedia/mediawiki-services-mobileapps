'use strict';

const AnnouncementType = {
    SURVEY: 'survey',
    FUNDRAISING: 'fundraising',
    ANNOUNCEMENT: 'announcement'
};

const type = AnnouncementType.ANNOUNCEMENT;
const activeWiki = 'en.wikipedia.org';
const startTime = '2018-05-25T00:01:00Z';
const endTimeIOS = '2018-05-31T23:59:00Z';
const endTimeAndroid = '2018-06-05T17:59:00Z';
const endTime = endTimeAndroid;
const androidMinVersion = 232;
const iosMinVersion = '5.8.0';
const iosMaxVersion = '5.8.1';
const idPrefix = 'ENBROWSEREXTENSION0518';
const callToActionUrl
    = 'https://www.mediawiki.org/wiki/Wikimedia_Apps/Reading_list_browser_extension';
const androidImageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Browser_extension_-_Android.png/800px-Browser_extension_-_Android.png';
const iosImageUrl = 'https://upload.wikimedia.org/wikipedia/commons/f/f5/Browser_extension_-_iOS.png';
const androidImageHeight = 168; // usually 160dp for Android
const buttonLabel = 'Learn more';
const negativeButtonLabel = 'Got it';

const countries = [ 'US', 'CA', 'GB', 'IE', 'AU', 'NZ', 'ZA' ];

/* eslint-disable-next-line max-len */
const coreBodyText = 'We now offer browser extensions for Chrome and Firefox, so you can save articles to your reading list when visiting Wikipedia on your laptop/desktop as well!';

const androidBodyText = `<b>Add to reading lists from the web</b><br><br>${coreBodyText}`;

const iosBodyText = `Add to reading lists from the web\n\n${coreBodyText}`;

module.exports = {
    activeWiki,
    startTime,
    endTime,
    endTimeIOS,
    endTimeAndroid,
    androidMinVersion,
    iosMinVersion,
    iosMaxVersion,
    idPrefix,
    type,
    callToActionUrl,
    androidImageUrl,
    iosImageUrl,
    androidImageHeight,
    buttonLabel,
    negativeButtonLabel,
    countries,
    androidBodyText,
    iosBodyText
};
