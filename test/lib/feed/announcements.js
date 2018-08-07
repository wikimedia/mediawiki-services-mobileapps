"use strict";

const domino = require('domino');
const assert = require('../../utils/assert');
const mut = require('../../../lib/feed/announcements.js'); // module under test
const config = require('../../../etc/feed/announcements');
const Platform = config.Platform;

const inactiveAnnouncementDomain = 'cs.wikipedia.org';
const activeAnnouncementDomain = 'en.wikipedia.org';

describe('lib:announcements', () => {
    it('should return no announcement for inactive wiki', () => {
        const res = mut.getAnnouncements(inactiveAnnouncementDomain);
        assert.ok(res.announce.length === 0);
    });

    it('should return one or more announcements for active wiki', () => {
        const res = mut.getAnnouncements(activeAnnouncementDomain);
        // assert.ok(res.announce.length === 0);
        assert.ok(res.announce.length === 2);
        assert.equal(res.announce[0].id, 'MULTILANG0818ANDROIDLATESTEN');
        assert.equal(res.announce[1].id, 'MULTILANG0818ANDROIDUPDATEPROMPTEN');
    });
});

describe('lib:announcements:etc', () => {
    it('should return an image (with correct per-platform label)', () => {
        const announcements = mut.testing.getActiveAnnouncements(activeAnnouncementDomain);
        announcements.forEach((announcement) => {
            if (announcement.platforms.includes(Platform.ANDROID_V2)) {
                assert.ok(announcement.image);
                assert.ok(!announcement.image_url);
            }
            // if (announcement.platforms.includes(Platform.IOS)) {
            //     assert.ok(announcement.image_url);
            //     assert.ok(!announcement.image);
            // }
        });
    });

    it('should return survey type', () => {
        const announcements = mut.testing.getActiveAnnouncements(activeAnnouncementDomain);
        announcements.forEach((elem) => {
            assert.ok(elem.type === 'announcement');
        });
    });

    it('countries is an array of strings', () => {
        const announcements = mut.testing.getActiveAnnouncements(activeAnnouncementDomain);
        announcements.forEach((elem) => {
            assert.ok(elem.countries.every(value => typeof value === 'string'));
        });
    });

    // no iOS announcement this time
    it.skip('should not deliver HTML in certain iOS announcements fields', () => {
        const doc = domino.createDocument();
        const activeAnnouncements = mut.testing.getActiveAnnouncements(activeAnnouncementDomain);
        const iosAnnouncement = activeAnnouncements.find(a => a.platforms.includes(Platform.IOS));
        // destructure 'id', 'text' and 'action.title' from the iOS announcement
        const { text, action: { title } } = iosAnnouncement;
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

    it('should deliver HTML in certain Android announcements fields', () => {
        const doc = domino.createDocument();
        const activeAnnouncements = mut.testing.getActiveAnnouncements(activeAnnouncementDomain);
        const androidAnnouncement
            = activeAnnouncements.find(a => a.platforms.includes(Platform.ANDROID_V2));
        const { text } = androidAnnouncement;
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

    // no caption html
    it.skip('caption_HTML on iOS should be inside a paragraph', () => {
        // eslint-disable-next-line camelcase
        const { caption_HTML } = mut.testing.iosAnnouncement;
        const doc = domino.createDocument(caption_HTML);
        assert.deepEqual(doc.body.firstElementChild.tagName, 'P');
    });

    // no caption html
    it.skip('caption_HTML on Android should not be inside a paragraph', () => {
        // eslint-disable-next-line camelcase
        const { caption_HTML } = mut.testing.androidAnnouncement;
        const doc = domino.createDocument(caption_HTML);
        assert.notDeepEqual(doc.body.firstElementChild.tagName, 'P');
    });

    it('buildId should not return lower case characters', () => {
        const id = config.buildId('IOS', 'US');
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
