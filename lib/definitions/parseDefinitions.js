/**
 * Parse definitions from Wiktionary Parsoid HTML.
 *
 * English Wiktionary entry layout guide:
 * https://en.wiktionary.org/wiki/Wiktionary:Entry_layout
 *
 * This version is for when Parsoid emits <section> tags.
 */

'use strict';

const sUtil = require('../util');
const transforms = require('../transforms');
const languageList = require('../../private/languages_list.json');
const parseExample = require('./parseExample');

/* This list has expanded beyond parts of speech to something more like "whatever
   categories of terms the Wiktionary editors decided to include", but we'll
   retain the variable name/response field since this is now what the app expects
   and changing it will require a coordinated service deployment/app release/RESTBase
   cache purge. */
const partsOfSpeech = {
    en:['Abbreviation',
        'Acronym',
        'Adjective',
        'Adverb',
        'Article',
        'Conjunction',
        'Contraction',
        'Determiner',
        'Idiom',
        'Infix',
        'Initialism',
        'Interjection',
        'Letter',
        'Noun',
        'Numeral',
        'Participle',
        'Particle',
        'Phrase',
        'Prefix',
        'Preposition',
        'Prepositional phrase',
        'Pronoun',
        'Proper noun',
        'Proverb',
        'Punctuation mark',
        'Romanization',
        'Suffix',
        'Syllable',
        'Symbol',
        'Verb' ]
};

function getLanguageCode(langName, wikiLangCode) {
    if (langName === 'Translingual') {
        return wikiLangCode;
    }
    return languageList[langName];
}

/**
 * This is where the sausage is made.  It seems no two Wiktionaries are
 * formatted the same way, so we'll figure out where they (usually) keep the
 * actual definitions on a wiki-by-wiki basis and pluck them out; this is
 * usually at least *internally* consistent.
 */
function getDefnList(parentNode, wikiLangCode) {
    let defnList;
    if (wikiLangCode === 'en') {
        defnList = parentNode.querySelectorAll('li');
    }
    return defnList;
}

function constructDefinition(element, wikiLangCode) {
    const currentDefinition = {};
    const exampleSelector = wikiLangCode === 'en' ? 'li > dl > dd' : 'li';
    const exampleElements = Array.from(element.querySelectorAll(exampleSelector));

    if (exampleElements.length > 0) {
        /* DOM sink status: safe - content from parsoid output */

        const html = element.innerHTML;
        currentDefinition.definition = html.substring(0, html.indexOf('<dl')).trim();
        const examples = exampleElements
            .map(e => parseExample(wikiLangCode, e))
            .filter(e => e.example && e.example.length > 0);

        if (examples.length > 0) {
            currentDefinition.parsedExamples = examples;
            currentDefinition.examples = examples.map(e => e.example);
        }
    } else {
        /* DOM sink status: safe - content from parsoid output */

        currentDefinition.definition = element.innerHTML.trim();
    }
    return currentDefinition;
}

function iterateOverPartsOfSpeechSections(definitions, wikiLangCode, currentLanguageHeading) {
    const currentLang = currentLanguageHeading.textContent;
    const currentLangSection = currentLanguageHeading.parentNode;
    const defnLangCode = getLanguageCode(currentLang, wikiLangCode) || 'other';

    const partsOfSpeechHeadings = currentLangSection.querySelectorAll(
        'section[data-mw-section-id]>h3,section[data-mw-section-id]>h4');
    for (let j = 0; j < partsOfSpeechHeadings.length; j++) {
        const partsOfSpeechHeading = partsOfSpeechHeadings[j];
        const partsOfSpeechSection = partsOfSpeechHeading.parentNode;
        const header = partsOfSpeechHeading.textContent;

        /* Parse definitions from part-of-speech sections */
        if (partsOfSpeech[wikiLangCode].indexOf(header) > -1) {
            const definitionSection = {};
            definitionSection.partOfSpeech = header;
            definitionSection.language = currentLang;
            definitionSection.definitions = [];
            const defnList = getDefnList(partsOfSpeechSection, wikiLangCode);
            for (let i = 0; i < defnList.length; i++) {
                definitionSection.definitions.push(constructDefinition(defnList[i], wikiLangCode));
            }

            if (!definitions[defnLangCode]) {
                definitions[defnLangCode] = [];
            }

            definitions[defnLangCode].push(definitionSection);
        }
    }
}

/**
 * Parses Wiktionary definitions.
 * @param {!document} doc the parsed DOM Document of the Parsoid output
 * @param {!string} domain the domain the request was directed to
 * @param {!string} title the title of the page requested
 * @return {Object} an object structure with definitions (with examples, where available)
 * for supported partOfSpeeches (Noun, Verb, ...) of all language headings found on the given
 * Wiktionary page
 */
function iterateOverLanguageSections(doc, domain, title) {
    const definitions = {};

    // H2 headings are language names per the English Wiktionary style guide (link above)
    const languageHeadings = doc.querySelectorAll('section[data-mw-section-id] > h2');
    const wikiLangCode = domain.split('.')[0];

    // Language-specific transforms
    if (wikiLangCode === 'en') {
        transforms.rmElements(doc, 'ul');    // remove citations
        transforms.rmElements(doc, '.nyms'); // remove semantic relations (T191365)
    }

    languageHeadings.forEach((languageHeading) => {
        iterateOverPartsOfSpeechSections(definitions, wikiLangCode, languageHeading);
    });

    // check if we have something to return or should error out
    if (Object.keys(definitions).length) {
        return definitions;
    }

    throw new sUtil.HTTPError({
        status: 404,
        type: 'not_found',
        title: 'No definition found',
        detail: `Could not find a definition for '${title}' on ${domain}.`
    });
}

module.exports = iterateOverLanguageSections;
