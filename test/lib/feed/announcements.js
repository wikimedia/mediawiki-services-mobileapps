"use strict";

const domino = require('domino');
const assert = require('../../utils/assert');
const mut = require('../../../lib/feed/announcements.js'); // module under test
const config = require('../../../etc/feed/announcements');

const inactiveAnnouncementDomain = 'de.wikipedia.org';
const activeAnnouncementDomain = 'en.wikipedia.org';

describe('announcements-unit', () => {
    it('should return no announcement for inactive wiki', () => {
        const res = mut.getAnnouncements(inactiveAnnouncementDomain);
        assert.ok(res.announce.length === 0);
    });

    it('should return some announcements for active wiki', () => {
        const res = mut.getAnnouncements(activeAnnouncementDomain);
        // assert.ok(res.announce.length === 0);
        assert.ok(res.announce.length === 1);
        assert.equal(res.announce[0].id, 'EN0518SURVEYANDROID');
    });

    it('should return an image', () => {
        const announcements = mut.testing.getActiveAnnouncements();
        announcements.forEach((elem) => {
            assert.ok(elem.image !== undefined);
            // assert.ok(elem.image_url === undefined);
        });
    });

    it('should return survey type', () => {
        const announcements = mut.testing.getActiveAnnouncements();
        announcements.forEach((elem) => {
            assert.ok(elem.type === 'survey');
        });
    });

    it('countries is an array of strings', () => {
        const announcements = mut.testing.getActiveAnnouncements();
        announcements.forEach((elem) => {
            assert.ok(elem.countries.every(value => typeof value === 'string'));
        });
    });

    it.skip('should not deliver HTML in certain iOS announcements fields', () => { // no iOS
        const doc = domino.createDocument();
        // destructure 'id', 'text' and 'action.title' from the iOS announcement
        const { text, action: { title } }
            = mut.testing.buildIosAnnouncement(config.countryVariants[0]);
        const fieldsToCheck = { text, title };
        for (const textOnlyFieldName of Object.keys(fieldsToCheck)) {
            const textToCheck = fieldsToCheck[textOnlyFieldName];
            const element = doc.createElement('div');
            element.innerHTML = textToCheck;
            // Comparing innerHTML and textContent lengths catches even non-tag html,
            // such as '&nbsp;';
            assert.equal(
                element.innerHTML.length, element.textContent.length,
                `iOS does not support HTML in the "${textOnlyFieldName}" field`
            );
        }
    });

    // skipped because the Android announcement is simpler this time
    it.skip('should deliver HTML in certain Android announcements fields', () => {
        const doc = domino.createDocument();
        const { text } = mut.testing.buildAndroidAnnouncement(config.countryVariants[0]);
        const fieldsToCheck = { text };
        for (const textOnlyFieldName of Object.keys(fieldsToCheck)) {
            const textToCheck = fieldsToCheck[textOnlyFieldName];
            const element = doc.createElement('div');
            element.innerHTML = textToCheck;

            // Looking for <br> tags
            assert.ok(
                element.querySelector('BR'),
                `Android should have some HTML line breaks in the "${textOnlyFieldName}" field`
            );
        }
    });

    it.skip('caption_HTML on iOS should be inside a paragraph', () => { // no iOS this time
        const { caption_HTML } = mut.testing.buildIosAnnouncement(config.countryVariants[0]); // eslint-disable-line max-len,camelcase
        const doc = domino.createDocument(caption_HTML);
        assert.deepEqual(doc.body.firstElementChild.tagName, 'P');
    });

    it('caption_HTML on Android should not be inside a paragraph', () => {
        const { caption_HTML } = mut.testing.buildAndroidAnnouncement(); // eslint-disable-line max-len,camelcase
        const doc = domino.createDocument(caption_HTML);
        assert.notDeepEqual(doc.body.firstElementChild.tagName, 'P');
    });

    it('buildId should not return lower case characters', () => {
        const id = mut.testing.buildId('IOS', 'US');
        assert.deepEqual(id, id.toUpperCase());
    });

    describe('.hasEnded', () => {
        let oldEndTime;

        beforeEach(() => {
            oldEndTime = config.endTime;
        });

        afterEach(() => {
            config.endTime = oldEndTime;
        });

        it('invalid endTime', () => {
            config.endTime = 'INVALID';
            assert.throws(() => {
                mut.testing.hasEnded(Date(Date.UTC(2030, 5, 1)));
            }, /config_error/);
        });

        it('endTime has passed', () => {
            config.endTime = '2017-12-20T23:59:00Z';
            assert.ok(mut.testing.hasEnded(new Date(Date.UTC(2017, 11, 21))));
        });

        it('endTime has not passed yet', () => {
            config.endTime = '2017-12-20T23:59:00Z';
            assert.ok(!mut.testing.hasEnded(new Date(Date.UTC(2017, 11, 20))));
        });
    });

    describe('announcements-unit-config', () => {
        const THIS_YEAR = new Date().getUTCFullYear();

        // Example: '2017-11-30T16:00:00Z'
        const SIMPLIFIED_ISO8610_REGEX
            = /^\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)$/;

        function checkValidDateStringFormat(dateString, label) {
            assert.ok(SIMPLIFIED_ISO8610_REGEX.test(dateString),
                `invalid date string format in ${label}`);
        }

        function checkYear(date, label) {
            const res = date.getUTCFullYear();
            assert.ok(THIS_YEAR - 1 < res || res < THIS_YEAR + 1,
                `invalid year ${res} in ${label}`);
        }

        function checkValidDate(date, label) {
            assert.ok(!isNaN(date.getTime()), `invalid date in ${label}`);
        }

        function checkDate(date, dateString, label) {
            checkValidDateStringFormat(dateString, label);
            checkValidDate(date, label);
            checkYear(date, label);
        }

        it('all dates should be valid', () => {
            const startDate = new Date(config.startTime);
            const endDate = new Date(config.endTime);

            checkDate(startDate, config.startTime, 'startTime');
            checkDate(endDate, config.endTime, 'endTime');
            assert.ok(startDate < endDate, 'endTime should be greater than startTime!');
        });
    });
});
