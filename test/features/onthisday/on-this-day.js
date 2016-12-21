'use strict';

const server = require('../../utils/server.js');
const onThisDay = require('../../../routes/on-this-day.js')();
const assert = require('../../utils/assert.js');
const domino = require('domino');
const preq = require('preq');
const headers = require('../../utils/headers');
const fs = require('fs');
const path = require('path');

const onThisDayLangs = require('../../../lib/on-this-day.languages');
const languages = onThisDayLangs.languages;

// UTILITY

function stringFromFixtureFile(fileName) {
    return fs.readFileSync(path.resolve(__dirname, `fixtures/${fileName}`), 'utf8');
}

function documentFromFixtureFile(fileName) {
    return domino.createDocument(stringFromFixtureFile(fileName));
}

function elementsFromFixtureFile(fileName, querySelector) {
    return Array.from(documentFromFixtureFile(fileName).querySelectorAll(querySelector));
}

// MOCK REQUESTS

const REQUEST_FOR_EN_01_30 = {
    params: {
        mm: '01',
        dd: '30',
        domain: 'en.wikipedia.org'
    }
};

const REQUEST_FOR_EN_12_01 = {
    params: {
        mm: '12',
        dd: '01',
        domain: 'en.wikipedia.org'
    }
};

const REQUEST_FOR_EN_1_1 = {
    params: {
        mm: '1',
        dd: '1',
        domain: 'en.wikipedia.org'
    }
};

// MOCK ANCHORS

/*
 * Events on selected anniversary pages ( like
 * https://en.wikipedia.org/wiki/Wikipedia:Selected_anniversaries/January_30 ) often have certain
 * anchors bolded to signify they refer to the main "topic" of the event. We mock a document here
 * with a topical and a non-topical anchor for testing our model objects.
 */
const MOCK_ANCHORS = elementsFromFixtureFile('topic-and-non-topic-anchors.html', 'a');
const TOPIC_ANCHOR = MOCK_ANCHORS[0];
const NON_TOPIC_ANCHOR = MOCK_ANCHORS[1];

// MOCK LIST ELEMENTS

const MOCK_EVENT_LIST_ELEMENTS =
    elementsFromFixtureFile('event-and-holiday-list-elements.html', 'li');
const SEABISCUIT_SELECTED_LIST_ELEMENT = MOCK_EVENT_LIST_ELEMENTS[0];
const LIVIA_BIRTH_LIST_ELEMENT = MOCK_EVENT_LIST_ELEMENTS[1];
const TEMPLE_EVENT_LIST_ELEMENT = MOCK_EVENT_LIST_ELEMENTS[2];
const GANDHI_DEATH_LIST_ELEMENT = MOCK_EVENT_LIST_ELEMENTS[3];
const MARTYRDOM_HOLIDAY_LIST_ELEMENT = MOCK_EVENT_LIST_ELEMENTS[4];
const NON_EVENT_LIST_ELEMENT = MOCK_EVENT_LIST_ELEMENTS[5];

// TESTS

describe('onthisday', function() {

    this.timeout(20000); // eslint-disable-line no-invalid-this

    before(() => { return server.start(); });

    it('"births" should respond to GET req w/expected headers, incl CORS and CSP headers', () => {
        headers.checkHeaders(`${server.config.uri}en.wikipedia.org/v1/onthisday/births/01/01`);
    });
    it('"deaths" should respond to GET req w/expected headers, incl CORS and CSP headers', () => {
        headers.checkHeaders(`${server.config.uri}en.wikipedia.org/v1/onthisday/deaths/01/01`);
    });
    it('"events" should respond to GET req w/expected headers, incl CORS and CSP headers', () => {
        headers.checkHeaders(`${server.config.uri}en.wikipedia.org/v1/onthisday/events/01/01`);
    });
    it('"holidays" should respond to GET req w/expected headers, incl CORS and CSP headers', () => {
        headers.checkHeaders(`${server.config.uri}en.wikipedia.org/v1/onthisday/holidays/01/01`);
    });
    it('"selected" should respond to GET req w/expected headers, incl CORS and CSP headers', () => {
        headers.checkHeaders(`${server.config.uri}en.wikipedia.org/v1/onthisday/selected/01/01`);
    });
    it('"all" should respond to GET req w/expected headers, incl CORS and CSP headers', () => {
        headers.checkHeaders(`${server.config.uri}en.wikipedia.org/v1/onthisday/all/01/01`);
    });

    // TEST PAGE TITLE GENERATION

    it('titleForDayPageFromMonthDayNumberStrings handles 1 digit mm and 1 digit dd', () => {
        assert.deepEqual(
            onThisDay.testing.titleForDayPageFromMonthDayNumberStrings('1', '1', 'en'),
            'January_1'
        );
    });
    it('titleForDayPageFromMonthDayNumberStrings handles 0 padded mm and 1 digit dd', () => {
        assert.deepEqual(
            onThisDay.testing.titleForDayPageFromMonthDayNumberStrings('01', '1', 'en'),
            'January_1'
        );
    });
    it('titleForDayPageFromMonthDayNumberStrings handles 0 padded mm and 0 padded dd', () => {
        assert.deepEqual(
            onThisDay.testing.titleForDayPageFromMonthDayNumberStrings('01', '01', 'en'),
            'January_1'
        );
    });

    // TEST DAY PAGE URI GENERATION

    it('dayTitleForRequest returns expected title for 0 padded month and 2 digit day', () => {
        assert.deepEqual(
            onThisDay.testing.dayTitleForRequest(REQUEST_FOR_EN_01_30),
            'January_30'
        );
    });
    it('dayTitleForRequest returns expected title for 2 digit month and 0 padded day', () => {
        assert.deepEqual(
            onThisDay.testing.dayTitleForRequest(REQUEST_FOR_EN_12_01),
            'December_1'
        );
    });
    it('dayTitleForRequest returns expected title for 1 digit month and 1 digit day', () => {
        assert.deepEqual(
            onThisDay.testing.dayTitleForRequest(REQUEST_FOR_EN_1_1),
            'January_1'
        );
    });

    // TEST SELECTED PAGE URI GENERATION

    it('selectedTitleForRequest returns expected title for 0 padded month and 2 digit day', () => {
        assert.deepEqual(
            onThisDay.testing.selectedTitleForRequest(REQUEST_FOR_EN_01_30),
            'Wikipedia:Selected_anniversaries/January_30'
        );
    });
    it('selectedTitleForRequest returns expected title for 2 digit month and 0 padded day', () => {
        assert.deepEqual(
            onThisDay.testing.selectedTitleForRequest(REQUEST_FOR_EN_12_01),
            'Wikipedia:Selected_anniversaries/December_1'
        );
    });
    it('selectedTitleForRequest returns expected title for 1 digit month and 1 digit day', () => {
        assert.deepEqual(
            onThisDay.testing.selectedTitleForRequest(REQUEST_FOR_EN_1_1),
            'Wikipedia:Selected_anniversaries/January_1'
        );
    });

    // TEST ANCHOR TO WMFPage TRANSFORMS

    it('WMFPage model object is correctly created from a topic anchor', () => {
        assert.deepEqual(onThisDay.testing.wmfPageFromAnchorElement(TOPIC_ANCHOR), {
            title: 'TOPIC_DBTITLE',
            isTopic: true
        });
    });

    it('WMFPage model object is correctly created from a non-topic anchor', () => {
        assert.deepEqual(onThisDay.testing.wmfPageFromAnchorElement(NON_TOPIC_ANCHOR), {
            title: 'NON_TOPIC_DBTITLE'
        });
    });

    // TEST LIST ELEMENT TO WMFEvent TRANSFORMS

    it('WMFEvent model object is correctly created from a selected list element', () => {
        assert.deepEqual(
            onThisDay.testing.wmfEventFromListElement(SEABISCUIT_SELECTED_LIST_ELEMENT, 'en'),
            {
                "text": "Canadian-American jockey George Woolf, who rode Seabiscuit to a famous " +
                        "victory over War Admiral in 1938, was fatally injured when he fell from " +
                        "his horse during a race.",
                "pages": [
                    {
                        "title": "Jockey"
                    },
                    {
                        "title": "George_Woolf",
                        "isTopic": true
                    },
                    {
                        "title": "Seabiscuit"
                    },
                    {
                        "title": "War_Admiral"
                    }
                ],
                "year": 1946
            }
        );
    });

    it('WMFEvent model object is correctly created from a birth list element', () => {
        assert.deepEqual(
            onThisDay.testing.wmfEventFromListElement(LIVIA_BIRTH_LIST_ELEMENT, 'en'),
            {
                "text": "Livia, Roman wife of Augustus (d. 29)",
                "pages": [
                    {
                        "title": "Livia"
                    },
                    {
                        "title": "Augustus"
                    }
                ],
                "year": -58
            }
        );
    });

    it('WMFEvent model object is correctly created from an event list element', () => {
        assert.deepEqual(
            onThisDay.testing.wmfEventFromListElement(TEMPLE_EVENT_LIST_ELEMENT, 'en'),
            {
                "text": "The Second Temple of Jerusalem finishes construction.",
                "pages": [
                    {
                        "title": "Second_Temple"
                    }
                ],
                "year": -516
            }
        );
    });

    it('WMFEvent model object is correctly created from a death list element', () => {
        assert.deepEqual(
            onThisDay.testing.wmfEventFromListElement(GANDHI_DEATH_LIST_ELEMENT, 'en'),
            {
                "text": "Mahatma Gandhi, Indian lawyer, philosopher, and activist (b. 1869)",
                "pages": [
                    {
                        "title": "Mahatma_Gandhi"
                    }
                ],
                "year": 1948
            }
        );
    });

    it('WMFHoliday model object is correctly created from a holiday list element', () => {
        assert.deepEqual(
            onThisDay.testing.wmfHolidayFromListElement(MARTYRDOM_HOLIDAY_LIST_ELEMENT),
            {
                "text": "Martyrdom of Mahatma Gandhi-related observances:\n Martyrs' Day " +
                        "(India)\n School Day of Non-violence and Peace (Spain)\n Start of " +
                        "the Season for Nonviolence January 30-April 4",
                "pages": [
                    {
                        "title": "Mahatma_Gandhi"
                    },
                    {
                        "title": "Martyrs'_Day_(India)"
                    },
                    {
                        "title": "School_Day_of_Non-violence_and_Peace"
                    },
                    {
                        "title": "Spain"
                    },
                    {
                        "title": "Season_for_Nonviolence"
                    }
                ]
            }
        );
    });

    it('wmfEventFromListElement should return null for elements not describing events', () => {
        assert.ok(onThisDay.testing.wmfEventFromListElement(NON_EVENT_LIST_ELEMENT, 'en') === null);
    });

    // LIVE TEST ENDPOINT INTERNALS PRODUCE AT LEAST SOME RESULTS FOR A GIVEN DAY.
    // DO NOT TEST FOR EXACT RESULT COUNT - THESE CHANGE AS PAGES ARE EDITED.
    // INSTEAD TEST THAT AT LEAST SOME RESULTS ARE RETURNED.

    function january30uriForEndpointName(endpointName) {
        return `${server.config.uri}en.wikipedia.org/v1/onthisday/${endpointName}/01/30/`;
    }
    function getJanuary30ResponseForEndpointName(endpointName) {
        return preq.get(january30uriForEndpointName(endpointName));
    }
    function verifyNonZeroEndpointResults(response, endpointName) {
        assert.ok(response.body.length > 0, `${endpointName} should have fetched some results`);
    }
    function fetchAndVerifyNonZeroResultsForEndpointName(endpointName) {
        return getJanuary30ResponseForEndpointName(endpointName)
         .then((response) => {
             verifyNonZeroEndpointResults(response, endpointName);
         });
    }
    it('BIRTHS fetches some results', () => {
        return fetchAndVerifyNonZeroResultsForEndpointName('births');
    });

    it('DEATHS fetches some results', () => {
        return fetchAndVerifyNonZeroResultsForEndpointName('deaths');
    });

    it('EVENTS fetches some results', () => {
        return fetchAndVerifyNonZeroResultsForEndpointName('events');
    });

    it('HOLIDAYS fetches some results', () => {
        return fetchAndVerifyNonZeroResultsForEndpointName('holidays');
    });

    it('SELECTED fetches some results', () => {
        return fetchAndVerifyNonZeroResultsForEndpointName('selected');
    });

    it('ALL fetches some results for births, deaths, events, holidays and selected', () => {
        return getJanuary30ResponseForEndpointName('all')
         .then((response) => {
             assert.ok(response.body.births.length > 0, 'ALL should return some births');
             assert.ok(response.body.deaths.length > 0, 'ALL should return some deaths');
             assert.ok(response.body.events.length > 0, 'ALL should return some events');
             assert.ok(response.body.holidays.length > 0, 'ALL should return some holidays');
             assert.ok(response.body.selected.length > 0, 'ALL should return some selected');
         });
    });

    it('eventsForYearListElements returns a WMFEvent for only year list elements', () => {
        assert.ok(
           onThisDay.testing.eventsForYearListElements(MOCK_EVENT_LIST_ELEMENTS, 'en').length === 4,
           'Should return WMFEvent for each of 4 year list elements'
        );
    });

    it('Year list element regex rejects malformed BC strings', () => {
        const regex = languages.en.yearListElementRegEx;
        assert.ok('23 BC BC BC – Bla bla'.match(regex) === null);
        assert.ok('23 BCBC – Bla bla'.match(regex) === null);
        assert.ok('23 BCX – Bla bla'.match(regex) === null);
    });

    it('Year list element regex accepts well formed BC strings', () => {
        const regex = languages.en.yearListElementRegEx;
        assert.ok('23 BC – Bla bla'.match(regex) !== null);
        assert.ok('23 bc – Bla bla'.match(regex) !== null);
        assert.ok('23BC – Bla bla'.match(regex) !== null);
    });

    it('Year list element regex accepts well formed BCE strings', () => {
        const regex = languages.en.yearListElementRegEx;
        assert.ok('23 BCE – Bla bla'.match(regex) !== null);
        assert.ok('23 bce – Bla bla'.match(regex) !== null);
        assert.ok('23BCE – Bla bla'.match(regex) !== null);
    });

    it('Year list element regex accepts well formed CE strings', () => {
        const regex = languages.en.yearListElementRegEx;
        assert.ok('1969 – Bla bla'.match(regex) !== null);
        assert.ok('23 – Bla bla'.match(regex) !== null);
    });

    it('Year list element regex rejects non year list strings', () => {
        const regex = languages.en.yearListElementRegEx;
        assert.ok('Bla bla'.match(regex) === null);
        assert.ok('XX – Bla bla'.match(regex) === null);
    });

    it('Year list element regex rejects strings missing text', () => {
        const regex = languages.en.yearListElementRegEx;
        assert.ok('23 BC – '.match(regex) === null);
        assert.ok('1969 –'.match(regex) === null);
    });

    it('Sort year list events in correct BC[E] aware manner', () => {
        const sortedEvents =
            onThisDay.testing.eventsForYearListElements(MOCK_EVENT_LIST_ELEMENTS, 'en')
        .sort(onThisDay.testing.reverseChronologicalWMFEventComparator);
        assert.ok(sortedEvents[0].year === 1948);
        assert.ok(sortedEvents[1].year === 1946);
        assert.ok(sortedEvents[2].year === -58);
        assert.ok(sortedEvents[3].year === -516);
    });

    it('Hydration should replace each \'title\' key with \'$merge\' key', () => {
        const events = onThisDay.testing.eventsForYearListElements(MOCK_EVENT_LIST_ELEMENTS, 'en');
        events.push(onThisDay.testing.wmfHolidayFromListElement(MARTYRDOM_HOLIDAY_LIST_ELEMENT));

        // Initially each page should have a title key but no $merge key
        for (const event of events) {
            for (const page of event.pages) {
                assert.ok(Object.prototype.hasOwnProperty.call(page, 'title'));
                assert.ok(Object.prototype.hasOwnProperty.call(page, '$merge') === false);
                assert.ok(page.title !== null);
            }
        }

        // Hydrate!
        onThisDay.testing.hydrateAllTitles(events, REQUEST_FOR_EN_01_30);

        // After hydration each page should have a $merge key but no title key
        for (const event of events) {
            for (const page of event.pages) {
                assert.ok(Object.prototype.hasOwnProperty.call(page, '$merge'));
                assert.ok(Object.prototype.hasOwnProperty.call(page, 'title') === false);
                assert.ok(page.$merge !== null);
            }
        }

        // Confirm expected number of pages exist post-hydration
        assert.ok(events[0].pages.length === 1);
        assert.ok(events[1].pages.length === 4);
        assert.ok(events[2].pages.length === 2);
        assert.ok(events[3].pages.length === 1);
        assert.ok(events[4].pages.length === 5);
    });

    it('listElementsByHeadingID extracts expected number of births from DE fixture', () => {
        // https://de.wikipedia.org/api/rest_v1/page/html/1._Dezember
        const document = documentFromFixtureFile('de.1._Dezember.html');
        const listElements = onThisDay.testing.listElementsByHeadingID(document, 'Geboren');
        assert.ok(listElements.length === 180);
    });

    it('listElementsByHeadingID extracts expected number of births from EN fixture', () => {
        // https://en.wikipedia.org/api/rest_v1/page/html/December_1
        const document = documentFromFixtureFile('en.December_1.html');
        const listElements = onThisDay.testing.listElementsByHeadingID(document, 'Births');
        assert.ok(listElements.length === 208);
    });

});
