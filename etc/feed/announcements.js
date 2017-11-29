'use strict';

const AnnouncementType = {
    SURVEY: 'survey',
    FUNDRAISING: 'fundraising'
};

const type = AnnouncementType.FUNDRAISING;
const activeWiki = 'en.wikipedia.org';
const startTime = '2017-11-30T16:00:00Z';
const endTime = '2017-12-31T00:00:00Z';
const idPrefix = 'EN1217';
const androidDestinationUrl
    = 'https://donate.wikimedia.org/?uselang=en&utm_medium=WikipediaAppFeed&utm_campaign=Android&utm_source=app_201712_6C_control';
const iosDestinationUrl
    = 'https://donate.wikimedia.org/?uselang=en&utm_medium=WikipediaAppFeed&utm_campaign=iOS&utm_source=app_201712_6C_control';
// TODO: consider removing jshint
// const imageUrl = undefined; // no image this time
const buttonLabel = 'Donate today';
const disclaimerHtml
    = 'Privacy disclaimer text: By submitting, you are agreeing to our <a href="https://wikimediafoundation.org/wiki/Donor_policy/en">donor privacy policy</a>';

const countryVariants = [ {
    countryCode: 'US',
    country: 'the U.S.',
    currency: '$',
    average: 15,
    coffee: 3
}, {
    countryCode: 'GB',
    country: 'the UK',
    currency: '£',
    average: 10,
    coffee: 2
}, {
    countryCode: 'AU',
    country: 'Australia',
    currency: '$',
    average: 15,
    coffee: 3
}, {
    countryCode: 'CA',
    country: 'Canada',
    currency: '$',
    average: 15,
    coffee: 3
}, {
    countryCode: 'NZ',
    country: 'New Zealand',
    currency: '$',
    average: 15,
    coffee: 3
}, {
    countryCode: 'IE',
    country: 'Ireland',
    currency: '€',
    average: 10,
    coffee: 2
}];

/**
 * Builds the body text. No HTML here since iOS doesn't support it.
 * @param {!object} vars an Object holding the variables for text substitution
 */
const buildBaseBodyText = ({ country, currency, average, coffee }) => {
    // replaced %COUNTRY% with ${country}, ...
    /* eslint-disable max-len */
    return `Hi reader in ${country}, it seems you use Wikipedia a lot; I think that’s great and hope you find it useful.
It’s a little awkward to ask, but today we need your help. We depend on donations averaging ${currency}${average}, but fewer than 1% of readers choose to give. If you donate just ${currency}${coffee}, you would help keep Wikipedia thriving for years. That’s right, the price of a cup of coffee is all I ask. Please take a minute to keep Wikipedia growing.
Thank you. — Jimmy Wales, Wikipedia Founder`;
    /* eslint-enable max-len */
};

module.exports = {
    activeWiki,
    startTime,
    endTime,
    idPrefix,
    type,
    androidDestinationUrl,
    iosDestinationUrl,
    // imageUrl,
    buttonLabel,
    disclaimerHtml,
    countryVariants,
    buildBaseBodyText
};
