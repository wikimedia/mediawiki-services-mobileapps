#!/usr/bin/env node

'use strict';

/**
 * @module scripts/multi-lang
 */

const BBPromise = require('bluebird');
const execSync = BBPromise.promisify(require('child_process').execSync);
const underscore = require('underscore');
const path = require('path');

const wikipediaLanguagesRawList = require(path.join(__dirname, '../private/languages_list.json'));
const prepareWikipediaLanguageCodes = () => {
	delete wikipediaLanguagesRawList['Simplified Chinese']; // skip lang variants
	delete wikipediaLanguagesRawList['Traditional Chinese'];
	return underscore.values(wikipediaLanguagesRawList);
};
const wikipediaLanguages = prepareWikipediaLanguageCodes();

function isWikipediaLanguage(lang) {
	return wikipediaLanguages.includes(lang);
}

function processOneLanguage(script, lang) {
	const cmd = `${script} ${lang}`;
	return execSync(cmd, { stdio: [ 0, 1, 2 ] })
		.then((rsp) => {
			return BBPromise.resolve();
		}).catch((err) => {
			process.stderr.write(`ERROR processing language ${lang}: ${err}`);
			return BBPromise.resolve();
		});
}

// MAIN
const [,, script, ...languages] = process.argv; // skip over first two items

BBPromise.each(languages, (lang) => {
	if (isWikipediaLanguage(lang)) {
		process.stdout.write(`${lang}\n`);
		processOneLanguage(script, lang);
	} else {
		process.stderr.write(`ERROR: ${lang} not a Wikipedia project code\n`);
	}
});
