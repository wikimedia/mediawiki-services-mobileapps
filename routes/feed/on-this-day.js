
'use strict';

const domino = require('domino');
const sUtil = require('../../lib/util');
const router = sUtil.router();
const mUtil = require('../../lib/mobile-util');
const parsoid = require('../../lib/parsoid-access');
const BBPromise = require('bluebird');
const HTTPError = require('../../lib/util').HTTPError;
const languages = require('../../lib/feed/on-this-day.languages.js').languages;

let app;

/**
 * Gets day page titles, which are formatted as follows: 'May_20'
 * @param {!String} monthNumberString string for month number ranging from '1' to '12'
 * @param {!String} dayNumberString string number for day of month
 * @param {!String} lang String for project language code
 * @return {!String} day page title. Example, inputs ('5', '20') returns 'May_20'
 */
function titleForDayPageFromMonthDayNumberStrings(monthNumberString, dayNumberString, lang) {
    const monthNumber = parseInt(monthNumberString, 10);
    const monthName = languages[lang].monthNames[monthNumber - 1];
    const dayNumber = parseInt(dayNumberString, 10);
    return languages[lang].dayPage.nameFormatter(monthName, monthNumber, dayNumber);
}

/**
 * Gets day page Parsoid title for day pages such as https://en.m.wikipedia.org/wiki/May_20
 * @param {!Request} req Request containing month (req.params.mm) and day (req.params.dd) number
 * string params
 * @return {!String} day page title for month and day number. Example, input mm '5' dd '20'
 * returns 'May_20'
 */
function dayTitleForRequest(req) {
    const lang = req.params.domain.split('.')[0];
    return titleForDayPageFromMonthDayNumberStrings(req.params.mm, req.params.dd, lang);
}

/**
 * Gets selected page titles, which are formatted as follows:
 * 'Wikipedia:Selected_anniversaries/May_20'
 * @param {!String} monthNumberString a string for month number ranging from '1' to '12'
 * @param {!String} dayNumberString a string number for day of month
 * @param {!String} lang a string for project language code
 * @return {!String} selected page title. Example, inputs ('5', '20') returns
 * 'Wikipedia:Selected_anniversaries/May_20'
 */
function titleForSelectedPageFromMonthDayNumberStrings(monthNumberString, dayNumberString, lang) {
    const monthNumber = parseInt(monthNumberString, 10);
    const monthName = languages[lang].monthNames[monthNumber - 1];
    const dayNumber = parseInt(dayNumberString, 10);
    return languages[lang].selectedPage.nameFormatter(monthName, monthNumber, dayNumber);
}

/**
 * Gets selected page Parsoid title for selected pages such as
 * https://en.m.wikipedia.org/wiki/Wikipedia:Selected_anniversaries/May_20. These pages are
 * also where 'Today' page https://en.m.wikipedia.org/wiki/Wikipedia:On_this_day/Today content comes
 * from.
 * @param {!Request} req Request containing month (req.params.mm) and day (req.params.dd) number
 * string params
 * @return {!String} elected page title for month and day number. Example, input mm '5' dd '20
 * returns 'Wikipedia:Selected_anniversaries/May_20'
 */
function selectedTitleForRequest(req) {
    const lang = req.params.domain.split('.')[0];
    return titleForSelectedPageFromMonthDayNumberStrings(req.params.mm, req.params.dd, lang);
}

/**
 * WMFPage models a link to a page
 * @param {!String} title a page title, i.e. 'Goat'
 * @param {!Boolean} isTopic events can have multiple links to pages, if this particular link is
 * bolded, such as those seen on https://en.m.wikipedia.org/wiki/Wikipedia:On_this_day/Today,
 * isTopic will be true.
 */
class WMFPage {
    constructor(title, isTopic) {
        this.title = title;
        if (isTopic) {
            this.isTopic = isTopic;
        }
    }
}

/**
 * WMFEvent models an historical event
 * @param {!String} text event description
 * @param {!Array} pages array of WMFPage's for the event
 * @param {!Integer} year the year the event first happened. A negative number indicates the event
 * occured 'BC' (sometimes also denoted 'BCE' - i.e. '32 BC' or '200 BCE)'.
 */
class WMFEvent {
    constructor(text, pages, year) {
        this.text = text;
        this.pages = pages;
        this.year = year;
    }
}

/**
 * WMFHoliday models an annually occuring holiday.
 * @param {!String} text event description
 * @param {!Array} pages array of WMFPage's for the event
 */
class WMFHoliday {
    constructor(text, pages) {
        this.text = text;
        this.pages = pages;
    }
}

/**
 * Converts document anchor element to WMFPage model.
 * @param {!AnchorElement} anchorElement Anchor to convert
 * @return {!WMFPage} a WMFPage
*/
function wmfPageFromAnchorElement(anchorElement) {
    const title = mUtil.extractDbTitleFromAnchor(anchorElement);
    const isTopic = anchorElement.parentElement.tagName === 'B';
    return new WMFPage(title, isTopic);
}

/**
 * Determines whether anchor is for specific year page.
 * @param  {!AnchorElement}  anchor
 * @param  {!Integer}  year
 * @param  {!String}  era
 * @return {!boolean}
 */
function isAnchorForYear(anchor, year, era) {
    return new RegExp(String.raw`^${Math.abs(year)}\s*${era}$`, 'i').test(anchor.title);
}

/**
 * Regex for determining whether anchor is not relative.
 * @type {RegExp}
 */
const nonRelativeAnchorRegex = new RegExp(String.raw`^http[s]?.*`, 'i');

/**
 * Determines whether anchor is relative.
 * @param  {!AnchorElement}  anchor
 * @return {!boolean}
 */
function isAnchorRelative(anchor) {
    return !nonRelativeAnchorRegex.test(anchor.href);
}

/**
 * Trims and also removes bracketed numbers.
 * @param  {!String} string
 * @return {!String}
 */
function cleanString(string) {
    return string.replace(/\[\d+\]/g, '').trim();
}

/**
 * Converts document list element to WMFEvent model.
 * A regular expression determines valid "year list elements" and separating their components.
 *  For example:    '399 BC - Death of Socrates'
 *    RegEx Capture groups:
 *    1st - entire match (will be non-null if the string looks like a year list element)
 *                  '399 BC - Death of Socrates'
 *    2nd - year number, required
 *                  '399'
 *    3rd - 'BC' indication string, optional
 *                  'BC'
 *    4th - event description string, required
 *                  'Death of Socrates'
 * @param {!ListElement} listElement List element to convert
 * @param {!String} lang String for project language code
 * @return {?WMFEvent} a WMFEvent or null if the list element isn't formatted as an event
*/
function wmfEventFromListElement(listElement, lang) {
    const regEx = languages[lang].yearListElementRegEx;
    const match = listElement.textContent.match(regEx);
    if (match === null) {
        return null;
    }

    let year = parseInt(match[1], 10);
    const isBC = (match[2] !== undefined);
    let era = '';
    if (isBC) {
        // Negate BC years so they sort correctly
        year = -year;
        era = match[2];
    }

    const textAfterYear = cleanString(match[3]);

    const pages = Array.from(listElement.querySelectorAll('a'))
        .filter((anchor) => {
            return !isAnchorForYear(anchor, year, era);
        })
        .filter(isAnchorRelative)
        .map(wmfPageFromAnchorElement);

    return new WMFEvent(textAfterYear, pages, year);
}

/**
 * Converts document list element to WMFHoliday model
 * @param {!ListElement} listElement List element to convert
 * @return {!WMFHoliday} a WMFHoliday
 */
function wmfHolidayFromListElement(listElement) {
    const text = cleanString(listElement.textContent);
    const pages = Array.from(listElement.querySelectorAll('a'))
      .filter(isAnchorRelative)
      .map(wmfPageFromAnchorElement);
    return new WMFHoliday(text, pages);
}

/**
 * WMFEvent comparator which properly handles negative 'BC'/'BCE' years
 * @param {!WMFEvent} eventA First event
 * @param {!WMFEvent} eventB Second event
 * @return {!Integer} number of years between eventB and eventA ( yearB - yearA ).
 */
function reverseChronologicalWMFEventComparator(eventA, eventB) {
    // Reminder: BC years are negative numbers.
    return eventB.year - eventA.year;
}

/**
 * Gets chronologically sorted array of WMFEvent models from an array of list elements.
 * @param {!Array} listElements an array of document list elements
 * @param {!String} lang a string for project language code
 * @return {!Array} sorted array of WMFEvent models, one for each year list element found
 * in 'listElements' argument
 */
function eventsForYearListElements(listElements, lang) {
    return listElements
        .map(element => wmfEventFromListElement(element, lang))
        .filter(possibleEvent => possibleEvent instanceof WMFEvent)
        .sort(reverseChronologicalWMFEventComparator);
}

/**
 * Gets array of WMFHoliday models from an array of list elements.
 * @param {!Array} listElements an array of document list elements
 * @return {!Array} an array of WMFHoliday models, one for each list element in
 * 'listElements' argument
 */
function holidaysForHolidayListElements(listElements) {
    return listElements
      .map(wmfHolidayFromListElement)
      .filter(possibleHoliday => possibleHoliday instanceof WMFHoliday);
}

/**
 * Determine if listElement has nested list elements.
 * @param  {!ListElement} listElement
 * @return {!boolean}
 */
function listElementHasDescendentListElements(listElement) {
    return listElement.querySelector('UL > LI') !== undefined;
}

/**
 * Return ancestor list element of listElement, if any.
 * Returns undefined unless listElement is nested inside another listElement.
 * @param  {!ListElement} listElement
 * @return {?ListElement}
 */
function ancestorListElementOfListElement(listElement) {
    const parent = listElement.parentElement;
    if (!parent) {
        return undefined;
    }
    const grandparent = parent.parentElement;
    if (!grandparent) {
        return undefined;
    }
    if (parent.tagName === 'UL' && grandparent.tagName === 'LI') {
        return grandparent;
    }
    return undefined;
}

/**
 * Gets prefix from a list element suitable to pre-pend to one of its decendent list element's
 * innerHTML.
 * @param  {!ListElement} ancestorListElement
 * @param  {!String} lang a string for project language code
 * @return {!String}
 */
function prefixFromAncestorListElement(ancestorListElement, lang) {
    const firstLine = ancestorListElement.textContent.split('\n')[0];
    const yearPrefixRegEx = languages[lang].yearPrefixRegEx;
    const result = firstLine.match(yearPrefixRegEx);
    const isFirstLineAYear = (result !== null);
    const firstLineStringToUse = isFirstLineAYear ? result[1] : firstLine;
    const separator = isFirstLineAYear ? ' - ' : '\n';
    const prefix = `${firstLineStringToUse.trim()}${separator}`;
    return prefix;
}

/**
 * Adds prefix from ancestor list elements to listElement.
 * @param {!ListElement} listElement
 * @param {!String} lang a string for project language code
 */
function addPrefixFromAncestorListElementsToListElement(listElement, lang) {
    const prefixes = [];
    let el = listElement;
    while ((el = ancestorListElementOfListElement(el))) {
        prefixes.push(prefixFromAncestorListElement(el, lang));
    }
    const prefixString = (prefixes.length ===  0) ? '' : `${prefixes.reverse().join('')}`;
    listElement.innerHTML = `${prefixString}${listElement.innerHTML.trim()}`;
}

/**
 * Gets list elements grouped under a given heading. Couldn't use pure CSS selector syntax for
 * extracting these - this is because some languages use further sub-headings under, say, 'births',
 * for things like 'Births before 1900' and so forth. We want *all* births, in this case - that is,
 * we want all list elements after the h2 'births' heading up until the next h2 heading.
 * @param {!Document} document a DOM document to examine
 * @param {!String} headingIds an array of heading id strings
 * @param {!String} lang a string for project language code
 * @return {!Array} an array of list elements
 */
function listElementsByHeadingID(document, headingIds, lang) {
    const elements = Array.from(document.querySelectorAll('h2,ul li'));
    const listElements = [];
    let grab = false;
    for (const element of elements) {
        if (element.tagName === 'H2') {
            grab = false;
            for (const headingId of headingIds) {
                if (element.id === headingId) {
                    grab = true;
                }
            }
        } else if (element.tagName === 'LI' && grab) {

            if (listElementHasDescendentListElements(element)) {
                continue;
            }
            addPrefixFromAncestorListElementsToListElement(element, lang);
            listElements.push(element);
        }
    }
    return listElements;
}

/**
 * Gets array of WMFEvent models of births found in a document
 * @param {!Document} document a DOM document to examine
 * @param {!String} lang a string for project language code
 * @return {!Object} an object containing list of births
 */
const birthsInDoc = (document, lang) => {
    const headingIds = languages[lang].dayPage.headingIds.births;
    return { births:
        eventsForYearListElements(listElementsByHeadingID(document, headingIds, lang), lang)
    };
};

/**
 * Gets array of WMFEvent models of deaths found in a document
 * @param {!Document} document a DOM document to examine
 * @param {!String} lang a string for project language code
 * @return {!Object} an object containing list of deaths
 */
const deathsInDoc = (document, lang) => {
    const headingIds = languages[lang].dayPage.headingIds.deaths;
    return { deaths:
        eventsForYearListElements(listElementsByHeadingID(document, headingIds, lang), lang)
    };
};

/**
 * Gets array of WMFEvent models of events found in a document
 * @param {!Document} document a DOM document to examine
 * @param {!String} lang a string for project language code
 * @return {!Object} an object containing list of events
 */
const eventsInDoc = (document, lang) => {
    const headingIds = languages[lang].dayPage.headingIds.events;
    return { events:
        eventsForYearListElements(listElementsByHeadingID(document, headingIds, lang), lang)
    };
};

/**
 * Gets array of WMFEvent models of holidays and observances found in a document
 * @param {!Document} document a DOM document to examine
 * @param {!String} lang a string for project language code
 * @return {!Object} an object containing list of holidays and observances
 */
const holidaysInDoc = (document, lang) => {
    const headingIds = languages[lang].dayPage.headingIds.holidays;
    return { holidays:
        holidaysForHolidayListElements(listElementsByHeadingID(document, headingIds, lang))
    };
};

/**
 * Gets array of WMFEvent models of editor curated selected anniversaries found in a document
 * @param {!Document} document a DOM document to examine
 * @param {!String} lang a string for project language code
 * @return {!Object} an object containing list of selected anniversaries
 */
const selectionsInDoc = (document, lang) => {
    const selector = languages[lang].selectedPage.listElementSelector;
    return { selected:
        eventsForYearListElements(document.querySelectorAll(selector), lang)
    };
};

/**
 * Gets dictionary of arrays of WMFEvent models of all types: 'births', 'deaths', 'events',
 * 'holidays' and 'selected'
 * @param {!Document} dayDoc a DOM document of events on a given day
 * @param {!Document} selectionsDoc a DOM document of editor curated events for a given day
 * @param {!string} lang a string for project language code
 * @return {!object} an object with keys for arrays of 'selected', 'events',
 * 'births', 'deaths', and 'holidays'
 */
const everythingInDayAndSelectionsDocs = (dayDoc, selectionsDoc, lang) => {
    const result = {};
    Object.assign(result,
        selectionsInDoc(selectionsDoc, lang),
        eventsInDoc(dayDoc, lang),
        birthsInDoc(dayDoc, lang),
        deathsInDoc(dayDoc, lang),
        holidaysInDoc(dayDoc, lang)
    );
    return result;
};

/**
 * Determines whether a DOM element has a 'title' property
 * @param {!object} object DOM element to examine
 * @return {!boolean} true if the object has a 'title' property
 */
function hasTitle(object) {
    return (
        object.hasOwnProperty('title') && // eslint-disable-line no-prototype-builtins
        typeof object.title === 'string'
    );
}

/**
 * Replaces 'title' property of a dom object with a '$merge' property set to the restbase url for
 * that title
 * @param {!Object} object DOM element to examine
 * @param {!String} domain Domain
 */
function hydrateTitle(object, domain) {
    const title = object.title;
    delete object.title;
    object.$merge = [ mUtil.getRbPageSummaryUrl(app.restbase_tpl, domain, title) ];
}

/**
 * Recursively hydrates all 'title' properties found in a dom object hierarchy
 * @param {!Object} object Dom object to examine
 * @param {!String} domain Domain
 */
function hydrateAllTitles(object, domain) {
    for (const property in object) {
        if (Object.prototype.hasOwnProperty.call(object, property)) {
            if (typeof object[property] === 'object') {
                hydrateAllTitles(object[property], domain);
            } else if (hasTitle(object)) {
                hydrateTitle(object, domain);
            }
        }
    }
}

/**
 * Ends a response. Hydrates titles and sets eTags, status etc.
 * @param {!Object} res a response to end
 * @param {!Object} output a payload to JSONify and deliver
 * @param {!String} domain a domain
 * @param {?String} revision a revision
 */
const endResponseWithOutput = (res, output, domain, revision) => {
    // Hydrate titles just before responding. Otherwise you'd have to leak
    // 'domain' details all the way down to the WMFPage constructor (which
    // destroys promise chain simplicity).
    hydrateAllTitles(output, domain);

    res.status(200);
    mUtil.setETag(res, revision);
    mUtil.setContentType(res, mUtil.CONTENT_TYPES.onthisday);
    res.json(output).end();
};

/**
 * Promises to get Parsoid html for a title
 * @param {!Request} req a request
 * @param {!String} title a page title to fetch
 * @return {!Promise} a Promise resolving to a response
 */
function fetchParsoidHtmlForTitle(req, title) {
    const parsoidReq = Object.create(req);
    parsoidReq.params.title = title;
    return parsoid.getParsoidHtml(app, parsoidReq);
}

/**
 * Fetches document and revision for URI
 * @param {!Object} req a request
 * @param {!Function} titleFunction a function for getting source page title from request
 * @return {!Promise} a Promise resolving to array containing [document, revision] for URI
 */
function fetchDocAndRevision(req, titleFunction) {
    let revision;
    return fetchParsoidHtmlForTitle(req, titleFunction(req))
    .then((response) => {
        revision = parsoid.getRevisionFromEtag(response.headers);
        return response.body;
    })
    .then(domino.createDocument)
    .then(doc => [doc, revision]);
}

const assertLanguage = (lang) => {
    if (!languages[lang]) {
        throw new HTTPError({
            status: 501,
            type: 'unsupported_language',
            title: 'Language not supported',
            detail: 'The language you have requested is not yet supported.'
        });
    }
};

/**
 * Fetches document for URI, extracts sought elements, responds
 * @param {!Request} req a request
 * @param {!Response} res a response
 * @param {!Function} titleFunction a function for getting source page title from request
 * @param  {!Function} extractionFunction a function for extracting sought elements
 * (births, deaths, holidays, etc)
 * @return {!Promise} a Promise resolving when response has completed
 */
function fetchAndRespond(req, res, titleFunction, extractionFunction) {
    const lang = req.params.domain.split('.')[0];
    assertLanguage(lang);

    return fetchDocAndRevision(req, titleFunction)
    .then((docAndRevision) => {
        const doc = docAndRevision[0];
        const revision = docAndRevision[1];
        const output = extractionFunction(doc, lang);
        endResponseWithOutput(res, output, req.params.domain, revision);
    });
}

/**
 * ENDPOINT for 'births' from 'Births' section of 'day' pages like:
 * https://en.m.wikipedia.org/wiki/May_20 Example:
 * http://localhost:6927/en.wikipedia.org/v1/feed/onthisday/births/01/30
 * GET {domain}/v1/feed/onthisday/births/{month}/{day}
 */
router.get('/births/:mm/:dd', (req, res) => {
    return fetchAndRespond(req, res, dayTitleForRequest, birthsInDoc);
});

/**
 * ENDPOINT for 'deaths' from 'Deaths' section of 'day' pages like:
 * https://en.m.wikipedia.org/wiki/May_20 Example:
 * http://localhost:6927/en.wikipedia.org/v1/feed/onthisday/deaths/01/30
 * GET {domain}/v1/feed/onthisday/deaths/{month}/{day}
 */
router.get('/deaths/:mm/:dd', (req, res) => {
    return fetchAndRespond(req, res, dayTitleForRequest, deathsInDoc);
});

/**
 * ENDPOINT for 'events' from 'Events' section of 'day' pages like:
 * https://en.m.wikipedia.org/wiki/May_20 Example:
 * http://localhost:6927/en.wikipedia.org/v1/feed/onthisday/events/01/30
 * GET {domain}/v1/feed/onthisday/events/{month}/{day}
 */
router.get('/events/:mm/:dd', (req, res) => {
    return fetchAndRespond(req, res, dayTitleForRequest, eventsInDoc);
});

/**
 * ENDPOINT for 'holidays' from 'Holiday and observances' section of 'day' pages like:
 * https://en.m.wikipedia.org/wiki/May_20 Example:
 * http://localhost:6927/en.wikipedia.org/v1/feed/onthisday/holidays/01/30
 * GET {domain}/v1/feed/onthisday/holidays/{month}/{day}
 */
router.get('/holidays/:mm/:dd', (req, res) => {
    return fetchAndRespond(req, res, dayTitleForRequest, holidaysInDoc);
});

/**
 * ENDPOINT for 'selected' editor curated events from pages like:
 * https://en.m.wikipedia.org/wiki/Wikipedia:On_this_day/Today Example:
 * http://localhost:6927/en.wikipedia.org/v1/feed/onthisday/selected/01/30
 * GET {domain}/v1/feed/onthisday/selected/{month}/{day}
 */
router.get('/selected/:mm/:dd', (req, res) => {
    return fetchAndRespond(req, res, selectedTitleForRequest, selectionsInDoc);
});

/**
 * ENDPOINT for 'all' - everything ('births', 'deaths', 'events', 'holidays' and 'selected') all in
 * one go Example: http://localhost:6927/en.wikipedia.org/v1/feed/onthisday/all/01/30
 * GET {domain}/v1/feed/onthisday/all/{month}/{day}
 */
router.get('/all/:mm/:dd', (req, res) => {
    const lang = req.params.domain.split('.')[0];
    assertLanguage(lang);

    return BBPromise.all([
        fetchDocAndRevision(req, dayTitleForRequest),
        fetchDocAndRevision(req, selectedTitleForRequest)
    ])
    .then((docsAndRevisions) => {
        const dayDocAndRevision = docsAndRevisions[0];
        const dayDoc = dayDocAndRevision[0];
        const dayRevision = dayDocAndRevision[1];

        const selectionsDocAndRevision = docsAndRevisions[1];
        const selectionsDoc = selectionsDocAndRevision[0];
        const selectionsRevision = selectionsDocAndRevision[1];

        const revision = Math.max(dayRevision, selectionsRevision);
        const output = everythingInDayAndSelectionsDocs(dayDoc, selectionsDoc, lang);
        endResponseWithOutput(res, output, req.params.domain, revision);
    });
});

module.exports = function(appObj) {
    app = appObj;
    return {
        path: '/feed/onthisday',
        api_version: 1,
        router,
        testing: { // Testing namespace
            dayTitleForRequest,
            selectedTitleForRequest,
            titleForDayPageFromMonthDayNumberStrings,
            WMFPage,
            WMFEvent,
            WMFHoliday,
            wmfHolidayFromListElement,
            wmfEventFromListElement,
            wmfPageFromAnchorElement,
            eventsForYearListElements,
            reverseChronologicalWMFEventComparator,
            hydrateAllTitles,
            listElementsByHeadingID,
            isAnchorForYear,
            addPrefixFromAncestorListElementsToListElement
        }
    };
};
