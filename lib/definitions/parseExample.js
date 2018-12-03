'use strict';

const parseMicroformats = require('./parseMicroformats');
const rmElementsWithSelector = require('../transformations/rmElementsWithSelector');

function parseMarkupExample(element) {
    // #:/#:: => dl/dd -> dl/dd (translation)
    const example = {};
    const translation = element.querySelector('dl dd');
    if (translation) {
        example.translation = translation.innerHTML.trim();
        rmElementsWithSelector(element, 'dl');
    }
    example.example = element.innerHTML.trim();
    return example;
}

function parseExample(wikiLangCode, element) {
    element.querySelectorAll('*[id^="mw"]').forEach(node => node.removeAttribute('id'));

    if (wikiLangCode === 'en') {
        const examples = parseMicroformats(element.innerHTML, 'h-usage-example');
        if (examples.length > 0) {
            return examples[0];
        }
    }
    if (element.tagName === 'DD') {
        return parseMarkupExample(element);
    } else {
        return { example: element.innerHTML.trim() };
    }
}

module.exports = parseExample;
