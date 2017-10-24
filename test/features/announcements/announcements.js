'use strict';

const domino = require('domino');
const preq   = require('preq');
const assert = require('../../utils/assert.js');
const server = require('../../utils/server.js');
const headers = require('../../utils/headers.js');

describe('announcements', function() {

    const activeAnnouncementUri = `${server.config.uri}fr.wikipedia.org/v1/feed/announcements`;
    const inactiveAnnouncementUri = `${server.config.uri}de.wikipedia.org/v1/feed/announcements`;

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => { return server.start(); });

    it('should respond to GET request with expected headers, incl. CORS and CSP headers', () => {
        return headers.checkHeaders(activeAnnouncementUri);
    });

    it('should return a valid response', () => {
        return preq.get({ uri: activeAnnouncementUri })
            .then((res) => {
                assert.status(res, 200);
                assert.equal(res.headers['cache-control'], 'public, max-age=7200, s-maxage=14400');
                res.body.announce.forEach((elem) => {
                    assert.ok(elem.id, 'id should be present');
                    assert.ok(elem.type, 'type should be present');
                    assert.ok(elem.start_time, 'start_time should be present');
                    assert.ok(elem.end_time, 'end_time should be present');
                    assert.ok(elem.text, 'text should be present');
                    assert.ok(elem.action.title, 'action text should be present');
                    assert.ok(elem.action.url, 'action url should be present');
                    assert.ok(elem.caption_HTML, 'caption_HTML should be present');
                    assert.ok(elem.countries, 'countries should be present');
                });
                // assert.ok(res.body.announce[0].image_url, 'image present');
                // assert.ok(res.body.announce[1].image, 'image present');
            });
    });

    // it('should return 2 announcements', () => {
    //     return preq.get({ uri: activeAnnouncementUri })
    //         .then((res) => {
    //             assert.ok(res.body.announce.length === 2);
    //             assert.equal(res.body.announce[0].id, 'EN0517SURVEYIOS');
    //             assert.equal(res.body.announce[1].id, 'EN0517SURVEYANDROID');
    //         });
    // });

    it('should return 0 surveys', () => {
        return preq.get({ uri: activeAnnouncementUri })
            .then((res) => {
                assert.ok(res.body.announce.length === 0);
            });
    });

    it('should return empty object for other wikis', () => {
        return preq.get({ uri: inactiveAnnouncementUri })
            .then((res) => {
                assert.ok(res.body.announce.length === 0);
            });
    });

    it('should not deliver HTML in certain iOS announcements fields', () => {
        const doc = domino.createDocument();
        return preq.get({ uri: activeAnnouncementUri })
            .then((res) => {
                assert.status(res, 200);
                res.body.announce
                  .filter(announcement => announcement.platforms.includes('iOSApp'))
                  .map((iOSAnnouncement) => {
                      // destructure 'id', 'text' and 'action.title' from the iOS announcement
                      const { id, text, action:{ title } } = iOSAnnouncement;
                      return { id, fieldsToCheck: { text, title } };
                  }).forEach((item) => {
                      for (const textOnlyFieldName of Object.keys(item.fieldsToCheck)) {
                          const textToCheck = item.fieldsToCheck[textOnlyFieldName];
                          const element = doc.createElement('div');
                          element.innerHTML = textToCheck;
                          // Comparing innerHTML and textContent lengths catches even non-tag html,
                          // such as '&nbsp;';
                          assert.equal(
                            element.innerHTML.length, element.textContent.length,
                              `iOS does not support HTML in the "${textOnlyFieldName}" field` +
                              ` - this was encountered in the "${item.id}" announcement`
                          );
                      }
                  });
            });
    });
});
