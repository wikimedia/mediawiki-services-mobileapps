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
var languageList = require('../static/languages_list.json');

var partsOfSpeech = {
                  /* English */
                  'en':['Noun',
                        'Verb',
                        'Adverb',
                        'Adjective',
                        'Pronoun',
                        'Interjection',
                        'Contraction',
                        'Determiner',
                        'Conjunction',
                        'Preposition'],

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

function hasUsageExamples(text, langCode) {
    return langCode === 'en' ? text.indexOf('<dl') > -1 : text.indexOf('<ul') > -1;
}

function getLanguageCode(langName) {
    return languageList[langName];
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
function getDefnList(output, wikiLangCode) {
    var defnList, ddList, doc;

    doc = domino.createDocument(output.text);
    transforms.inlineSpanText(doc);
    transforms.rmElementsWithSelector(doc, 'sup');

    switch (wikiLangCode) {
        case 'en':
            transforms.rmElementsWithSelector(doc, 'ul');
            defnList = doc.querySelectorAll('li');
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
    var j, examples, currentDefinition = {};

    if (hasUsageExamples(element.innerHTML, wikiLangCode)) {
        currentDefinition.definition = element.innerHTML.substring(0, element.innerHTML.indexOf('<dl')).trim();
        currentDefinition.examples = [];
        examples = wikiLangCode === 'en' ? element.querySelectorAll('dd') : element.querySelectorAll('li');
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
function parse(doc, wikiLangCode) {
    // TODO: update once Parsoid emits section tags, see https://phabricator.wikimedia.org/T114072#1711063
    var definitions = {},
        definitionSection,
        header,
        i,
        output,
        defnList,
        defnLangCode = null,
        currentLangSection,
        node = doc.body.firstChild,
        hasContent = false;

    output = parseSection(node);

    while (output.nextNode) {
        hasContent = true;
        header = stripMarkup(output.nextSection.line);

        /* Get the language from the first H1 header, and begin iterating over sections.
           Per the English Wiktionary style guide (linked in header above), H1 headings
           are language names. */
        if (output.nextSection.toclevel === 1) {
            defnLangCode = getLanguageCode(header);
        }

        /* Parse definitions from part-of-speech sections */
        if (defnLangCode && partsOfSpeech[wikiLangCode].indexOf(header) > -1) {
            definitionSection = initializeDefinitionSection(output.nextSection);
            output = parseSection(output.nextNode);

            defnList = getDefnList(output, wikiLangCode);
            for (i = 0; i < defnList.length; i++) {
                definitionSection.definitions.push(constructDefinition(defnList[i], wikiLangCode));
            }

            if (!definitions[defnLangCode]) {
                definitions[defnLangCode] = [];
            }

            definitions[defnLangCode].push(definitionSection);
        } else {
            //TODO: just update output with reference to next node; don't needlessly "collect"
            output = parseSection(output.nextNode);
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
        detail: 'Could not find a definition for the term.'
    });
}

module.exports = parse;
