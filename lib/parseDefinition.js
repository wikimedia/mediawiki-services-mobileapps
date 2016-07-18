/**
 * Parse definitions from Wiktionary Parsoid HTML.
 *
 * English Wiktionary entry layout guide:
 * https://en.wiktionary.org/wiki/Wiktionary:Entry_layout
 */

'use strict';

var domino = require('domino');
var sUtil = require('./util');
var mUtil = require('./mobile-util');
var transforms = require('./transforms');
var parseSection = require('./parseSection');
var languageList = require('../static/languages_list.json');

/* This list has expanded beyond parts of speech to something more like "whatever
   categories of terms the Wiktionary editors decided to include", but we'll
   retain the variable name/response field since this is now what the app expects
   and changing it will require a coordinated service deployment/app release/RESTBase
   cache purge. */
var partsOfSpeech = {
                  /* English */
                  'en':['Abbreviation',
                        'Acronym',
                        'Adjective',
                        'Adverb',
                        'Article',
                        'Conjunction',
                        'Contraction',
                        'Determiner',
                        'Interjection',
                        'Letter',
                        'Noun',
                        'Numeral',
                        'Participle',
                        'Particle',
                        'Phrase',
                        'Prefix',
                        'Preposition',
                        'Pronoun',
                        'Proper noun',
                        'Punctuation mark',
                        'Suffix',
                        'Syllable',
                        'Symbol',
                        'Verb' ],

                  /* French */
                  /* 'fr':['Nom',
                        'Déterminant',
                        'Adjectif',
                        'Pronom',
                        'Verbe',
                        'Adverbe',
                        'Préposition',
                        'Conjunction']
                  */
                };

function stripSpanTags(text) {
    return text.replace(/<\/?span[^>]*>/g, '');
}

function stripItalicTags(text) {
    return text.replace(/<\/?i[^>]*>/g, '');
}

function decodeHTML(text) {
    return text.replace(/&lt;/g,'<')
               .replace(/&gt;/g,'>')
               .replace(/&amp;/g,'&')
               .replace(/&nbsp;/g, ' ');
}

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
    var defnList;
    switch (wikiLangCode) {
        case 'en':
            defnList = doc.querySelectorAll('div[id=' + id + '] li');
            break;
        //case 'fr':
        //    defnList = doc.querySelector('ol').children;
        //    break;
        default:
            break;
    }
    return defnList;
}

function constructDefinition(element, wikiLangCode) {
    var j, example, examples, defn, currentDefinition = {};

    if (hasUsageExamples(element.innerHTML, wikiLangCode)) {
        currentDefinition.definition = element.innerHTML.substring(0, element.innerHTML.indexOf('<dl')).trim();
        currentDefinition.examples = [];
        examples = wikiLangCode === 'en' ? element.querySelectorAll('dd') : element.querySelectorAll('li');
        for (j = 0; j < examples.length; j++) {
            example = examples[j].innerHTML.trim();
            example = decodeHTML(example);
            example = stripSpanTags(example);
            example = stripItalicTags(example);
            currentDefinition.examples.push(example);
        }
    } else {
        defn = element.innerHTML.trim();
        defn = decodeHTML(defn);
        defn = stripSpanTags(defn);
        defn = stripItalicTags(defn);
        currentDefinition.definition = defn;
    }
    return currentDefinition;
}

/**
 * @param {document} doc the parsed DOM Document of the Parsoid output
 * @return {definitions[]} an array of objects, organized by part of speech,
 * containing definitions (with examples, where available) from Wiktionary
 */
function parse(doc, domain, title) {
    // TODO: update once Parsoid emits section tags, see https://phabricator.wikimedia.org/T114072#1711063
    var i, j,
        currentLang,
        definitions = {},
        definitionSection,
        defnList,
        defnLangCode = null,
        header,
        sectionDivs = doc.querySelectorAll('div[id^="section_"]'),
        currentSectionDiv,
        wikiLangCode = domain.split('.')[0];

    // Language-specific transforms
    if (wikiLangCode === 'en') {
        transforms.rmElementsWithSelector(doc, 'ul');
    }

    for (j = 0; j < sectionDivs.length; j++) {
        currentSectionDiv = sectionDivs[j];
        header = mUtil.stripMarkup(currentSectionDiv.title);

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
        detail: 'Could not find a definition for \'' + title + '\' on ' + domain + '.'
    });
}

module.exports = parse;
