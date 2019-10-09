'use strict';

const BBPromise = require('bluebird');
const router = require('../../lib/util').router();
const lib = require('../../lib/feed/on-this-day');

let app;

/**
 * ENDPOINT for 'births' from 'Births' section of 'day' pages like:
 * https://en.m.wikipedia.org/wiki/May_20 Example:
 * http://localhost:6927/en.wikipedia.org/v1/feed/onthisday/births/01/30
 * GET {domain}/v1/feed/onthisday/births/{month}/{day}
 */
router.get('/births/:mm/:dd', (req, res) => {
    return lib.fetchAndRespond(app, req, res, lib.dayTitleForRequest, lib.birthsInDoc);
});

/**
 * ENDPOINT for 'deaths' from 'Deaths' section of 'day' pages like:
 * https://en.m.wikipedia.org/wiki/May_20 Example:
 * http://localhost:6927/en.wikipedia.org/v1/feed/onthisday/deaths/01/30
 * GET {domain}/v1/feed/onthisday/deaths/{month}/{day}
 */
router.get('/deaths/:mm/:dd', (req, res) => {
    return lib.fetchAndRespond(app, req, res, lib.dayTitleForRequest, lib.deathsInDoc);
});

/**
 * ENDPOINT for 'events' from 'Events' section of 'day' pages like:
 * https://en.m.wikipedia.org/wiki/May_20 Example:
 * http://localhost:6927/en.wikipedia.org/v1/feed/onthisday/events/01/30
 * GET {domain}/v1/feed/onthisday/events/{month}/{day}
 */
router.get('/events/:mm/:dd', (req, res) => {
    return lib.fetchAndRespond(app, req, res, lib.dayTitleForRequest, lib.eventsInDoc);
});

/**
 * ENDPOINT for 'holidays' from 'Holiday and observances' section of 'day' pages like:
 * https://en.m.wikipedia.org/wiki/May_20 Example:
 * http://localhost:6927/en.wikipedia.org/v1/feed/onthisday/holidays/01/30
 * GET {domain}/v1/feed/onthisday/holidays/{month}/{day}
 */
router.get('/holidays/:mm/:dd', (req, res) => {
    return lib.fetchAndRespond(app, req, res, lib.dayTitleForRequest, lib.holidaysInDoc);
});

/**
 * ENDPOINT for 'selected' editor curated events from pages like:
 * https://en.m.wikipedia.org/wiki/Wikipedia:On_this_day/Today Example:
 * http://localhost:6927/en.wikipedia.org/v1/feed/onthisday/selected/01/30
 * GET {domain}/v1/feed/onthisday/selected/{month}/{day}
 */
router.get('/selected/:mm/:dd', (req, res) => {
    return lib.fetchAndRespond(app, req, res, lib.selectedTitleForRequest, lib.selectionsInDoc);
});

/**
 * ENDPOINT for 'all' - everything ('births', 'deaths', 'events', 'holidays' and 'selected') all in
 * one go Example: http://localhost:6927/en.wikipedia.org/v1/feed/onthisday/all/01/30
 * GET {domain}/v1/feed/onthisday/all/{month}/{day}
 */
router.get('/all/:mm/:dd', (req, res) => {
    const lang = req.params.domain.split('.')[0];
    lib.assertLanguage(lang);

    return BBPromise.all([
        lib.fetchDocAndRevision(req, lib.dayTitleForRequest),
        lib.fetchDocAndRevision(req, lib.selectedTitleForRequest)
    ])
    .then((docsAndRevisions) => {
        const dayDocAndRevision = docsAndRevisions[0];
        const dayDoc = dayDocAndRevision[0];
        const dayRevision = dayDocAndRevision[1];

        const selectionsDocAndRevision = docsAndRevisions[1];
        const selectionsDoc = selectionsDocAndRevision[0];
        const selectionsRevision = selectionsDocAndRevision[1];

        const revision = Math.max(dayRevision, selectionsRevision);
        const output = lib.everythingInDayAndSelectionsDocs(dayDoc, selectionsDoc, lang);
        lib.endResponseWithOutput(app, res, output, req.params.domain, revision);
    });
});

module.exports = function(appObj) {
    app = appObj;
    return {
        path: '/feed/onthisday',
        api_version: 1,
        router
    };
};
