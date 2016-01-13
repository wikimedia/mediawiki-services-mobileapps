/**
 * Parse definitions from Wiktionary Parsoid HTML.
 *
 * English Wiktionary entry layout guide:
 * https://en.wiktionary.org/wiki/Wiktionary:Entry_layout
 */

'use strict';

var domino = require('domino');
var sUtil = require('./util');
var transforms = require('./transforms');
var parseSection = require('./parseSection');

var Language = {
    ENGLISH: 0
    //FRENCH: 1,
};

var languageFilter = [
                      'English',
                      //'Français',
                     ];

var partsOfSpeech = {
                  /* English */
                  0: ['Noun',
                  'Verb',
                  'Adverb',
                  'Adjective',
                  'Pronoun',
                  'Interjection',
                  'Contraction',
                  'Determiner',
                  'Conjunction',
                  'Preposition'],

                  // French
                  /* 1: ['Nom',
                  'Déterminant',
                  'Adjectif',
                  'Pronom',
                  'Verbe',
                  'Adverbe',
                  'Préposition',
                  'Conjunction']
                  */
                };

function stripMarkup(text) {
    return text.replace(/<[^>]*>/g, '');
}

function stripSpanTags(text) {
    return text.replace(/<\/?span[^>]*>/g, '');
}

function stripItalicTags(text) {
    return text.replace(/<\/?i[^>]*>/g, '');
}

function decodeHTML(text) {
    return text.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&nbsp;/g, ' ');
}

function hasUsageExamples(text, language) {
    return language === Language.ENGLISH ? text.indexOf('<dl') > -1 : text.indexOf('<ul') > -1;
}

function getLanguage(text) {
    var wiktionaryLanguage;
    switch(text) {
        case 'English':
            wiktionaryLanguage = Language.ENGLISH;
            break;
        //case 'Français':
        //    wiktionaryLanguage = Language.FRENCH;
        //    break;
        default:
            break;
    }
    return wiktionaryLanguage;
}

function isSupportedLanguageName(text) {
    return languageFilter.indexOf(text) > -1;
}

function isSupportedLanguageSection(output) {
    return output.nextSection.toclevel === 1 && isSupportedLanguageName(stripMarkup(output.nextSection.line));
}

function initializeDefinitionSection(obj) {
    var result = obj;
    result.partOfSpeech = stripMarkup(obj.line);
    result.toclevel = result.line = result.anchor = undefined;
    result.definitions = [];
    return result;
}

/**
 * This is where the sausage is made.  It seems no two Wiktionaries are
 * formatted the same way, so we'll figure out where they (usually) keep the
 * actual definitions on a wiki-by-wiki basis and pluck them out; this is
 * usually at least *internally* consistent.
 */
function getDefnList(output, wiktionaryLanguage) {
    var defnList, ddList, doc;

    doc = domino.createDocument(output.text);
    transforms.inlineSpanText(doc);
    transforms.rmElementsWithSelector(doc, 'sup');

    switch (wiktionaryLanguage) {
        case Language.ENGLISH:
            transforms.rmElementsWithSelector(doc, 'ul');
            defnList = doc.querySelectorAll('li');
            break;
        //case Language.FRENCH:
        //    defnList = doc.querySelector('ol').children;
        //    break;
        default:
            break;
    }
    return defnList;
}

function constructDefinition(element, wiktionaryLanguage) {
    var j, examples, currentDefinition = {};

    if (hasUsageExamples(element.innerHTML, wiktionaryLanguage)) {
        currentDefinition.definition = element.innerHTML.substring(0, element.innerHTML.indexOf('<dl')).trim();
        currentDefinition.examples = [];
        examples = wiktionaryLanguage === Language.ENGLISH ? element.querySelectorAll('dd') : element.querySelectorAll('li');
        for (j = 0; j < examples.length; j++) {
            currentDefinition.examples.push(stripItalicTags(stripSpanTags(decodeHTML(examples[j].innerHTML.trim()))));
        }
    } else {
        currentDefinition.definition = stripItalicTags(stripSpanTags(decodeHTML(element.innerHTML.trim())));
    }
    return currentDefinition;
}

/**
 * @param {document} doc the parsed DOM Document of the Parsoid output
 * @return {definitions[]} an array of objects, organized by part of speech,
 * containing definitions (with examples, where available) from Wiktionary
 */
function parse(doc) {
    // TODO: update once Parsoid emits section tags, see https://phabricator.wikimedia.org/T114072#1711063
    var definitions = [],
        definitionSection,
        header,
        i,
        output,
        defnList,
        wiktionaryLanguage = null,
        node = doc.body.firstChild,
        hasContent = false;

    output = parseSection(node);

    while (output.nextNode) {
        hasContent = true;
        header = stripMarkup(output.nextSection.line);

        // Get the language from the first H1 header, and begin iterating over sections.
        if (isSupportedLanguageSection(output)) {
            wiktionaryLanguage = getLanguage(header);
        } else if (wiktionaryLanguage === null || output.nextSection.toclevel === 1) {
            // Stop iterating over sections when we run into a new language.
            break;
        }

        /* Parse definitions from part-of-speech sections */
        if (partsOfSpeech[wiktionaryLanguage].indexOf(header) > -1) {
            definitionSection = initializeDefinitionSection(output.nextSection);
            output = parseSection(output.nextNode);

            defnList = getDefnList(output, wiktionaryLanguage);
            for (i = 0; i < defnList.length; i++) {
                definitionSection.definitions.push(constructDefinition(defnList[i], wiktionaryLanguage));
            }

            definitions.push(definitionSection);
        } else {
            //TODO: just update output with reference to next node; don't needlessly "collect"
            output = parseSection(output.nextNode);
        }
    }

    // check if we have something to return or should error out
    if (definitions.length) {
        return definitions;
    }
    if (hasContent && wiktionaryLanguage === null) {
        // the language is not supported
        throw new sUtil.HTTPError({
            status: 501,
            type: 'unsupported_language',
            title: 'Language not supported',
            detail: 'The language you have requested is not yet supported.'
        });
    }
    // no definition found
    throw new sUtil.HTTPError({
        status: 404,
        type: 'not_found',
        title: 'No definition found',
        detail: 'Could not find a definition for the term.'
    });
}

module.exports = parse;
