'use strict';

const AnnouncementType = {
    SURVEY: 'survey',
    FUNDRAISING: 'fundraising'
};

const type = AnnouncementType.SURVEY;
const activeWiki = 'en.wikipedia.org';
const startTime = '2018-05-08T15:00:00Z';
const endTime = '2018-05-15T15:00:00Z';
const androidMinVersion = 230;
const androidMaxVersion = 240;
const idPrefix = 'EN0518';
const androidDestinationUrl
    = 'https://docs.google.com/forms/d/e/1FAIpQLSdbDr9g5jqWMenW5TQH__H-WGz3iYZC9T3ASeMzCgUFh7foDQ/viewform';
const imageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Announcement_card_-_sync_reading_list_feedback_form.png/800px-Announcement_card_-_sync_reading_list_feedback_form.png';
const imageHeight = 80; // usually 160dp for Android
const buttonLabel = 'Send feedback';
const negativeButtonLabel = 'No thanks';
const disclaimerHtml
    = 'Feedback form powered by 3rd-party service; see <a href="https://wikimediafoundation.org/wiki/Reading_List_Sync_Feedback_Survey_Privacy_Statement">privacy statement</a>.';

const countries = [ 'US', 'CA', 'GB', 'IE', 'AU', 'NZ' ];

/**
 * Builds the body text for Android. HTML is ok here since it's not for iOS.
 */
const buildAndroidBodyText = () => {
    /* eslint-disable-next-line max-len */
    return `<b>Hi Android reader</b>, what’s been your experience with using our new reading list syncing feature? Send your feedback in the form linked below.`;
};

module.exports = {
    activeWiki,
    startTime,
    endTime,
    androidMinVersion,
    androidMaxVersion,
    idPrefix,
    type,
    androidDestinationUrl,
    imageUrl,
    imageHeight,
    buttonLabel,
    negativeButtonLabel,
    disclaimerHtml,
    countries,
    buildAndroidBodyText
};
