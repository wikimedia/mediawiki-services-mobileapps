'use strict';

const domino = require('domino');
const fs = require('fs');
const path = require('path');
const assert = require('../../utils/assert.js');
const rbTemplate = require('../../utils/testUtil').rbTemplate;
const onThisDay = require('../../../lib/feed/on-this-day.js');
const onThisDayLangs = require('../../../lib/feed/on-this-day.languages.js');
const languages = onThisDayLangs.languages;

// UTILITY

function stringFromFixtureFile(fileName) {
    const fixturePath = `../../features/onthisday/fixtures/${fileName}`;
    return fs.readFileSync(path.resolve(__dirname, fixturePath), 'utf8');
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

/**
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

describe('onthisday-unit', () => {

    describe('page title generation: titleForDayPageFromMonthDayNumberStrings', () => {
        it('1 digit mm and 1 digit dd', () => {
            assert.deepEqual(
                onThisDay.titleForDayPageFromMonthDayNumberStrings('1', '1', 'en'),
                'January_1'
            );
        });
        it('0 padded mm and 1 digit dd', () => {
            assert.deepEqual(
                onThisDay.titleForDayPageFromMonthDayNumberStrings('01', '1', 'en'),
                'January_1'
            );
        });
        it('0 padded mm and 0 padded dd', () => {
            assert.deepEqual(
                onThisDay.titleForDayPageFromMonthDayNumberStrings('01', '01', 'en'),
                'January_1'
            );
        });
    });

    describe('day page URI generation: dayTitleForRequest', () => {
        it('returns expected title for 0 padded month and 2 digit day', () => {
            assert.deepEqual(
                onThisDay.dayTitleForRequest(REQUEST_FOR_EN_01_30),
                'January_30'
            );
        });
        it('returns expected title for 2 digit month and 0 padded day', () => {
            assert.deepEqual(
                onThisDay.dayTitleForRequest(REQUEST_FOR_EN_12_01),
                'December_1'
            );
        });
        it('returns expected title for 1 digit month and 1 digit day', () => {
            assert.deepEqual(
                onThisDay.dayTitleForRequest(REQUEST_FOR_EN_1_1),
                'January_1'
            );
        });
    });

    describe('selected page URI generation: selectedTitleForRequest', () => {
        it('returns expected title for 0 padded month and 2 digit day', () => {
            assert.deepEqual(
                onThisDay.selectedTitleForRequest(REQUEST_FOR_EN_01_30),
                'Wikipedia:Selected_anniversaries/January_30'
            );
        });
        it('returns expected title for 2 digit month and 0 padded day', () => {
            assert.deepEqual(
                onThisDay.selectedTitleForRequest(REQUEST_FOR_EN_12_01),
                'Wikipedia:Selected_anniversaries/December_1'
            );
        });
        it('returns expected title for 1 digit month and 1 digit day', () => {
            assert.deepEqual(
                onThisDay.selectedTitleForRequest(REQUEST_FOR_EN_1_1),
                'Wikipedia:Selected_anniversaries/January_1'
            );
        });
    });

    describe('anchor to WMFPage transforms: wmfPageFromAnchorElement', () => {
        it('WMFPage model object is correctly created from a topic anchor', () => {
            assert.deepEqual(onThisDay.wmfPageFromAnchorElement(TOPIC_ANCHOR), {
                title: 'TOPIC_DBTITLE',
                isTopic: true
            });
        });
        it('WMFPage model object is correctly created from a non-topic anchor', () => {
            assert.deepEqual(onThisDay.wmfPageFromAnchorElement(NON_TOPIC_ANCHOR), {
                title: 'NON_TOPIC_DBTITLE'
            });
        });
    });

    describe('wmfEventFromListElement: WMFEvent model object is correctly created', () => {
        it('from a selected list element', () => {
            assert.deepEqual(
                onThisDay.wmfEventFromListElement(SEABISCUIT_SELECTED_LIST_ELEMENT, 'en'),
                {
                    text: 'Canadian-American jockey George Woolf, who rode Seabiscuit to a ' +
                            'famous victory over War Admiral in 1938, was fatally injured when ' +
                            'he fell from his horse during a race.',
                    pages: [
                        {
                            title: 'Jockey'
                        },
                        {
                            title: 'George_Woolf',
                            isTopic: true
                        },
                        {
                            title: 'Seabiscuit'
                        },
                        {
                            title: 'War_Admiral'
                        }
                    ],
                    year: 1946
                }
            );
        });
        it('from a birth list element', () => {
            assert.deepEqual(
                onThisDay.wmfEventFromListElement(LIVIA_BIRTH_LIST_ELEMENT, 'en'),
                {
                    text: 'Livia, Roman wife of Augustus (d. 29)',
                    pages: [
                        {
                            title: 'Livia'
                        },
                        {
                            title: 'Augustus'
                        }
                    ],
                    year: -58
                }
            );
        });
        it('from an event list element', () => {
            assert.deepEqual(
                onThisDay.wmfEventFromListElement(TEMPLE_EVENT_LIST_ELEMENT, 'en'),
                {
                    text: 'The Second Temple of Jerusalem finishes construction.',
                    pages: [
                        {
                            title: 'Second_Temple'
                        }
                    ],
                    year: -516
                }
            );
        });
        it('from a death list element', () => {
            assert.deepEqual(
                onThisDay.wmfEventFromListElement(GANDHI_DEATH_LIST_ELEMENT, 'en'),
                {
                    text: 'Mahatma Gandhi, Indian lawyer, philosopher, and activist (b. 1869)',
                    pages: [
                        {
                            title: 'Mahatma_Gandhi'
                        }
                    ],
                    year: 1948
                }
            );
        });
        it('wmfEventFromListElement should return null for elements not describing events', () => {
            assert.ok(onThisDay.wmfEventFromListElement(NON_EVENT_LIST_ELEMENT, 'en') === null);
        });
    });

    describe('wmfHolidayFromListElement: WMFHoliday model object is correctly created', () => {
        it('WMFHoliday model object is correctly created from a holiday list element', () => {
            assert.deepEqual(
                onThisDay.wmfHolidayFromListElement(MARTYRDOM_HOLIDAY_LIST_ELEMENT),
                {
                    text: "Martyrdom of Mahatma Gandhi-related observances:\n Martyrs' Day " +
                            '(India)\n School Day of Non-violence and Peace (Spain)\n Start of ' +
                            'the Season for Nonviolence January 30-April 4',
                    pages: [
                        {
                            title: 'Mahatma_Gandhi'
                        },
                        {
                            title: "Martyrs'_Day_(India)"
                        },
                        {
                            title: 'School_Day_of_Non-violence_and_Peace'
                        },
                        {
                            title: 'Spain'
                        },
                        {
                            title: 'Season_for_Nonviolence'
                        }
                    ]
                }
            );
        });
    });

    it('eventsForYearListElements returns a WMFEvent for only year list elements', () => {
        assert.deepEqual(
            onThisDay.eventsForYearListElements(MOCK_EVENT_LIST_ELEMENTS, 'en').length, 4,
            'Should return WMFEvent for each of 4 year list elements'
        );
    });

    describe('yearListElementRegEx', () => {
        it('rejects malformed BC strings', () => {
            const regex = languages.en.yearListElementRegEx;
            assert.ok('23 BC BC BC – Bla bla'.match(regex) === null);
            assert.ok('23 BCBC – Bla bla'.match(regex) === null);
            assert.ok('23 BCX – Bla bla'.match(regex) === null);
        });
        it('accepts well formed BC strings', () => {
            const regex = languages.en.yearListElementRegEx;
            assert.ok('23 BC – Bla bla'.match(regex) !== null);
            assert.ok('23 bc – Bla bla'.match(regex) !== null);
            assert.ok('23BC – Bla bla'.match(regex) !== null);
        });
        it('accepts well formed BCE strings', () => {
            const regex = languages.en.yearListElementRegEx;
            assert.ok('23 BCE – Bla bla'.match(regex) !== null);
            assert.ok('23 bce – Bla bla'.match(regex) !== null);
            assert.ok('23BCE – Bla bla'.match(regex) !== null);
        });
        it('accepts well formed CE strings', () => {
            const regex = languages.en.yearListElementRegEx;
            assert.ok('23 CE – Bla bla'.match(regex) !== null);
            assert.ok('23 ce – Bla bla'.match(regex) !== null);
            assert.ok('23CE – Bla bla'.match(regex) !== null);
        });
        it('accepts well formed year strings (no BCE/AD/CE)', () => {
            const regex = languages.en.yearListElementRegEx;
            assert.ok('1969 – Bla bla'.match(regex) !== null);
            assert.ok('23 – Bla bla'.match(regex) !== null);
        });
        it('accepts well formed AD strings', () => {
            const regex = languages.en.yearListElementRegEx;
            assert.ok('4 AD – Bla bla'.match(regex) !== null);
            assert.ok('1 AD – Bla bla'.match(regex) !== null);
            assert.ok('AD 1 – Bla bla'.match(regex) !== null);
        });
        it('extracts expected BC/BCE strings', () => {
            const regex = languages.en.yearListElementRegEx;
            assert.ok('4 CE – Bla bla'.match(regex)[2] === undefined);
            assert.ok('4CE – Bla bla'.match(regex)[2] === undefined);
            assert.ok('4 AD – Bla bla'.match(regex)[2] === undefined);
            assert.deepEqual('1 BC – Bla bla'.match(regex)[2], 'BC');
            assert.deepEqual('1BC – Bla bla'.match(regex)[2], 'BC');
            assert.deepEqual('1bce – Bla bla'.match(regex)[2], 'bce');
            assert.deepEqual('1 bce – Bla bla'.match(regex)[2], 'bce');
            assert.ok('AD 1 – Bla bla'.match(regex)[2] === undefined);
        });
        it('AD strings should not be negated', () => {
            const regex = languages.en.yearListElementRegEx;
            assert.ok('4 AD – Bla bla'.match(regex)[2] === undefined,
                'should not capture 2nd group');
        });
        it('rejects non year list strings', () => {
            const regex = languages.en.yearListElementRegEx;
            assert.ok('Bla bla'.match(regex) === null);
            assert.ok('XX – Bla bla'.match(regex) === null);
        });
        it('rejects strings missing text', () => {
            const regex = languages.en.yearListElementRegEx;
            assert.ok('23 BC – '.match(regex) === null);
            assert.ok('1969 –'.match(regex) === null);
        });
    });

    it('Sort year list events in correct BC[E] aware manner', () => {
        const sortedEvents =
            onThisDay.eventsForYearListElements(MOCK_EVENT_LIST_ELEMENTS, 'en')
        .sort(onThisDay.reverseChronologicalWMFEventComparator);
        assert.deepEqual(sortedEvents[0].year, 1948);
        assert.deepEqual(sortedEvents[1].year, 1946);
        assert.deepEqual(sortedEvents[2].year, -58);
        assert.deepEqual(sortedEvents[3].year, -516);
    });

    it("'title' keys should be replaced with '$merge' keys", () => {
        const events = onThisDay.eventsForYearListElements(MOCK_EVENT_LIST_ELEMENTS, 'en');
        events.push(onThisDay.wmfHolidayFromListElement(MARTYRDOM_HOLIDAY_LIST_ELEMENT));

        // Initially each page should have a title key but no $merge key
        for (const event of events) {
            for (const page of event.pages) {
                assert.ok(Object.prototype.hasOwnProperty.call(page, 'title'));
                assert.ok(Object.prototype.hasOwnProperty.call(page, '$merge') === false);
                assert.ok(page.title !== null);
            }
        }

        onThisDay.createMergeNodes(rbTemplate, events, REQUEST_FOR_EN_01_30);

        // After creating merge nodes, each page should have a $merge key but no title key
        for (const event of events) {
            for (const page of event.pages) {
                assert.ok(Object.prototype.hasOwnProperty.call(page, '$merge'));
                assert.ok(Object.prototype.hasOwnProperty.call(page, 'title') === false);
                assert.ok(page.$merge !== null);
            }
        }

        // Confirm expected number of pages exist
        assert.deepEqual(events[0].pages.length, 1);
        assert.deepEqual(events[1].pages.length, 4);
        assert.deepEqual(events[2].pages.length, 2);
        assert.deepEqual(events[3].pages.length, 1);
        assert.deepEqual(events[4].pages.length, 5);
    });

    describe('listElementsByHeadingID extracts expected number of births from', () => {
        it('DE fixture', () => {
            // https://de.wikipedia.org/api/rest_v1/page/html/1._Dezember
            const document = documentFromFixtureFile('de.1._Dezember.html');
            const listElements = onThisDay.listElementsByHeadingID(document, ['Geboren'], 'de');
            assert.deepEqual(listElements.length, 188);
        });
        it('EN fixture', () => {
            // https://en.wikipedia.org/api/rest_v1/page/html/December_1
            const document = documentFromFixtureFile('en.December_1.html');
            const listElements = onThisDay.listElementsByHeadingID(document, ['Births'], 'en');
            assert.deepEqual(listElements.length, 203);
        });
        it('AR fixture', () => {
            // https://ar.wikipedia.org/api/rest_v1/page/html/1_يناير
            const document = documentFromFixtureFile('ar.January_1.html');
            const listElements = onThisDay
              .listElementsByHeadingID(document, ['.D9.85.D9.88.D8.A7.D9.84.D9.8A.D8.AF'], 'ar');
            assert.deepEqual(listElements.length, 69);
        });
        it('BS fixture', () => {
            // https://bs.wikipedia.org/api/rest_v1/page/html/1._januar
            const document = documentFromFixtureFile('bs.1._januar.html');
            const listElements = onThisDay.listElementsByHeadingID(document, ['Rođeni'], 'bs');
            assert.deepEqual(listElements.length, 28);
        });
    });

    describe('nested list element handling', () => {
        // https://en.wikipedia.org/api/rest_v1/page/html/December_1
        const enDocument = documentFromFixtureFile('en.December_1.html');
        const enListElements =
            onThisDay.listElementsByHeadingID(
                enDocument, ['Holidays_and_observances'], 'en'
            );
        it('listElementsByHeadingID extracts expected number of holidays from EN fixture', () => {
            assert.deepEqual(enListElements.length, 23);
        });
        it('expected textContent for a list item NOT nested within another list item', () => {
            assert.deepEqual(enListElements[0].textContent, 'Battle of the Sinop Day (Russia)');
        });
        it('expected textContent for a list item nested within another list item', () => {
            assert.deepEqual(
                enListElements[1].textContent, 'Christian feast day:\nBlessed Bruna Pellesi'
            );
        });

        // https://ar.wikipedia.org/api/rest_v1/page/html/1_يناير
        const arDocument = documentFromFixtureFile('ar.January_1.html');
        const arListElements = onThisDay.listElementsByHeadingID(
            arDocument, ['.D9.85.D9.88.D8.A7.D9.84.D9.8A.D8.AF'], 'ar'
        );
        it('expected textContent for list items nested within a year-dash list item', () => {
            assert.deepEqual(arListElements[18].textContent,
                '1919 - إحسان عبد القدوس، روائي مصري.');
            assert.deepEqual(arListElements[19].textContent,
                '1919 - جيروم ديفيد سالينغر، روائي أمريكي.');
        });

        // https://sv.wikipedia.org/api/rest_v1/page/html/25_augusti
        const svDocument = documentFromFixtureFile('sv.Augusti_25.html');
        const svListElements = onThisDay.listElementsByHeadingID(
            svDocument, ['Avlidna'], 'sv'
        );
        it('expected textContent for list items nested within a year list item (no dash)', () => {
            assert.deepEqual(svListElements[22].textContent,
                '1984 - Truman Capote, amerikansk författare.');
            assert.deepEqual(svListElements[21].textContent,
                '1984 - Anders Uddberg, svensk musiker.');
        });

        describe('addPrefixFromAncestorListElementsToListElement', () => {
            it('expected extraction from ancestor year element', () => {
                const LI = domino.createDocument(`
                    <ul>
                      <li>1992
                      <ul>
                        <li id='nestedLI'>This happened.
                      </ul>
                    </ul>`).querySelector('#nestedLI');
                onThisDay.addPrefixFromAncestorListElementsToListElement(LI, 'en');
                assert.equal(LI.textContent, '1992 - This happened.');
            });
            it('expected extraction from multiline ancestor year element', () => {
                const LI = domino.createDocument(`
                    <ul>
                      <li>1992
                          Other text
                      <ul>
                        <li id='nestedLI'>This happened.
                      </ul>
                    </ul>`).querySelector('#nestedLI');
                onThisDay.addPrefixFromAncestorListElementsToListElement(LI, 'en');
                assert.equal(LI.textContent, '1992 - This happened.');
            });
            it('expected extraction from ancestor year element with dash', () => {
                const LI = domino.createDocument(`
                    <ul>
                      <li>1992-
                      <ul>
                        <li id='nestedLI'>This happened.
                      </ul>
                    </ul>`).querySelector('#nestedLI');
                onThisDay.addPrefixFromAncestorListElementsToListElement(LI, 'en');
                assert.equal(LI.textContent, '1992 - This happened.');
            });
            it('expected extraction from ancestor year element with dash space', () => {
                const LI = domino.createDocument(`
                    <ul>
                      <li>1992 -
                      <ul>
                        <li id='nestedLI'>This happened.
                      </ul>
                    </ul>`).querySelector('#nestedLI');
                onThisDay.addPrefixFromAncestorListElementsToListElement(LI, 'en');
                assert.equal(LI.textContent, '1992 - This happened.');
            });
            it('expected extraction from multiline ancestor year element with dash', () => {
                const LI = domino.createDocument(`
                    <ul>
                      <li>1992 -
                          Other text
                      <ul>
                        <li id='nestedLI'>This happened.
                      </ul>
                    </ul>`).querySelector('#nestedLI');
                onThisDay.addPrefixFromAncestorListElementsToListElement(LI, 'en');
                assert.equal(LI.textContent, '1992 - This happened.');
            });
            it('expected extraction from multiline non-year ancestor', () => {
                const LI = domino.createDocument(`
                    <ul>
                      <li>Christian feast day:
                          Other text
                      <ul>
                        <li id='nestedLI'>Blessed Bruna Pellesi
                      </ul>
                    </ul>`).querySelector('#nestedLI');
                onThisDay.addPrefixFromAncestorListElementsToListElement(LI, 'en');
                assert.equal(
                    LI.textContent, 'Christian feast day:\nBlessed Bruna Pellesi'
                );
            });
            it('expected extraction from double-nested list element', () => {
                const LI = domino.createDocument(`
                    <ul>
                      <li>Animal
                      <ul>
                        <li>Bird
                        <ul>
                          <li id='nestedLI'>Chicken
                        </ul>
                      </ul>
                    </ul>`).querySelector('#nestedLI');
                onThisDay.addPrefixFromAncestorListElementsToListElement(LI, 'en');
                assert.equal(
                    LI.textContent, 'Animal\nBird\nChicken'
                );
            });
            it('expected extraction from triple-nested list element', () => {
                const LI = domino.createDocument(`
                  <ul>
                    <li>Animal
                    <ul>
                      <li>Bird
                      <ul>
                        <li>Chicken
                        <ul>
                          <li id='nestedLI'>Dinner
                        </ul>
                      </ul>
                    </ul>
                  </ul>`).querySelector('#nestedLI');
                onThisDay.addPrefixFromAncestorListElementsToListElement(LI, 'en');
                assert.equal(
                    LI.textContent, 'Animal\nBird\nChicken\nDinner'
                );
            });
            it('expected extraction from nested Russian list element with "год"', () => {
                const LI = domino.createDocument(`
                    <ul>
                      <li>2002 год
                      <ul>
                        <li id='nestedLI'>Посредством хакерской атаки была взломана компьютерная.
                      </ul>
                    </ul>`).querySelector('#nestedLI');
                onThisDay.addPrefixFromAncestorListElementsToListElement(LI, 'ru');
                assert.equal(
                    LI.textContent, '2002 - Посредством хакерской атаки была взломана компьютерная.'
                );
            });
            it('Prefixed text content from ancestor element is escaped', () => {
                const LI = domino.createDocument(`
                    <ul>
                      <li>&lt;script&gt;alert(1);&lt;/script&gt;
                      <ul>
                        <li id='nestedLI'><b>Foo</b>
                      </ul>
                    </ul>`).querySelector('#nestedLI');
                onThisDay.addPrefixFromAncestorListElementsToListElement(LI, 'en');
                assert.equal(LI.innerHTML, '&lt;script&gt;alert(1);&lt;/script&gt;\n<b>Foo</b>');
            });
        });
    });

    describe('isAnchorForYear', () => {
        const a = domino.createDocument().createElement('A');
        it('correctly identifies anchor linking to year article', () => {
            a.title = '2008';
            assert.ok(onThisDay.isAnchorForYear(a, 2008, ''));
        });
        it('correctly rejects anchor linking article starting with a year', () => {
            a.title = '2008 Something something';
            assert.ok(!onThisDay.isAnchorForYear(a, 2008, ''));
        });
        it('correctly rejects anchor linking article starting with a number', () => {
            a.title = '123456 Something something';
            assert.ok(!onThisDay.isAnchorForYear(a, 2008, ''));
        });
        it('correctly rejects anchor linking article not starting with a year', () => {
            a.title = 'Something something';
            assert.ok(!onThisDay.isAnchorForYear(a, 2008, ''));
        });
        it('correctly identifies anchor linking to year article with an era string', () => {
            a.title = '2008 BC';
            assert.ok(onThisDay.isAnchorForYear(a, 2008, 'BC'));
        });
        it('correctly identifies anchor linking to year article with era string w/o space', () => {
            a.title = '55BC';
            assert.ok(onThisDay.isAnchorForYear(a, 55, 'BC'));
        });
    });

    describe('external urls should be excluded', () => {
        it('exclude external url from WMFHoliday pages', () => {
            const LI = domino.createDocument(`
                <ul>
                  <li id='thisLI'>
                    <a href="https://someexternallink" title="Some external link">
                      some external link
                    </a>
                    <a href="./Cat" title="Cat">
                      Cat
                    </a>
                  </li>
                </ul>
              `).querySelector('#thisLI');
            const event = onThisDay.wmfHolidayFromListElement(LI, 'en');
            assert.equal(event.pages.length, 1);
            assert.equal(event.pages[0].title, 'Cat');
        });
        it('exclude external url from WMFEvent pages', () => {
            const LI = domino.createDocument(`
                <ul>
                  <li id='thisLI'>
                    1999 -
                    <a href="http://someexternallink" title="Some external link">
                      some external link
                    </a>
                    <a href="./Dog" title="Dog">
                      Dog
                    </a>
                  </li>
                </ul>
              `).querySelector('#thisLI');
            const event = onThisDay.wmfEventFromListElement(LI, 'en');
            assert.equal(event.pages.length, 1);
            assert.equal(event.pages[0].title, 'Dog');
        });
    });
});
