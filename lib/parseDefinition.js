/**
 * Parse definitions from Wiktionary Parsoid HTML.
 *
 * English Wiktionary entry layout guide:
 * https://en.wiktionary.org/wiki/Wiktionary:Entry_layout
 */

'use strict';

const sUtil = require('./util');
const transforms = require('./transforms');
const languageList = require('../private/languages_list.json');

/* This list has expanded beyond parts of speech to something more like "whatever
   categories of terms the Wiktionary editors decided to include", but we'll
   retain the variable name/response field since this is now what the app expects
   and changing it will require a coordinated service deployment/app release/RESTBase
   cache purge. */
const partsOfSpeech = {
    'en':['Abbreviation',
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

function hasUsageExamples(text, langCode) {
    return langCode === 'en' ? text.indexOf('<dl') > -1 : text.indexOf('<ul') > -1;
}

function getLanguageCode(langName, wikiLangCode) {
    if (langName === "Translingual") {
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
function getDefnList(doc, id, wikiLangCode) {
    let defnList;
    if (wikiLangCode === 'en') {
        defnList = doc.querySelectorAll(`div[id=${id}] li`);
    }
    return defnList;
}

function constructDefinition(element, wikiLangCode) {
    const currentDefinition = {};

    let example;
    let examples;
    let j;

    if (hasUsageExamples(element.innerHTML, wikiLangCode)) {
        const html = element.innerHTML;
        const selector = wikiLangCode === 'en' ? 'dd' : 'li';

        currentDefinition.definition = html.substring(0, html.indexOf('<dl')).trim();
        currentDefinition.examples = [];
        examples = element.querySelectorAll(selector);
        for (j = 0; j < examples.length; j++) {
            example = examples[j].innerHTML.trim();
            currentDefinition.examples.push(example);
        }
    } else {
        currentDefinition.definition = element.innerHTML.trim();
    }
    return currentDefinition;
}

/**
 * @param {!document} doc the parsed DOM Document of the Parsoid output
 * @return {!definitions[]} an array of objects, organized by part of speech,
 * containing definitions (with examples, where available) from Wiktionary
 */
function parse(doc, domain, title) {
    // TODO: update once Parsoid emits section tags, see https://phabricator.wikimedia.org/T114072#1711063
    let currentLang;
    let currentSectionDiv;
    const definitions = {};
    let definitionSection;
    let defnList;
    let defnLangCode = null;
    let header;
    let i;
    let j;
    const sectionDivs = doc.querySelectorAll('div[id^="section_"]');
    const wikiLangCode = domain.split('.')[0];

    // Language-specific transforms
    if (wikiLangCode === 'en') {
        transforms.rmElementsWithSelector(doc, 'ul');
    }

    for (j = 0; j < sectionDivs.length; j++) {
        currentSectionDiv = sectionDivs[j];
        header = currentSectionDiv.title;

        /* Get the language from the first H2 header, and begin iterating over sections.
           Per the English Wiktionary style guide (linked in header above), H2 headings
           are language names. */
        if (currentSectionDiv.className.substring('toclevel_'.length) === "1") {
            currentLang = header;
            defnLangCode = getLanguageCode(header, wikiLangCode) || 'other';
        }

        /* Parse definitions from part-of-speech sections */
        if (partsOfSpeech[wikiLangCode].indexOf(header) > -1) {
            definitionSection = {};
            definitionSection.partOfSpeech = header;
            definitionSection.language = currentLang;
            definitionSection.definitions = [];
            defnList = getDefnList(doc, currentSectionDiv.id, wikiLangCode);
            for (i = 0; i < defnList.length; i++) {
                definitionSection.definitions.push(constructDefinition(defnList[i], wikiLangCode));
            }

            if (!definitions[defnLangCode]) {
                definitions[defnLangCode] = [];
            }

            definitions[defnLangCode].push(definitionSection);
        }
    }

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

module.exports = parse;
