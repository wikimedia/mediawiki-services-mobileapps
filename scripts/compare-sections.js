#!/usr/bin/env node

'use strict';

/*
  Setup notes before running this script:
  * Start two local Parsoid instances on ports 8000 and 8001. The latter would get the new code.
  * Start two local MCS instances on ports 8888 and 8898.
  * Change the config.dev.yaml also to hook up with the respective local Parsoid installations, e.g.
  *     v1) MCS:8888 -> Parsoid:8000
  *     v2) MCS:8898 -> Parsoid:8001
  * and towards the end of the config.dev.yaml also change the restbase_req uri value to
  *     v1) uri: http://0.0.0.0:8000/{{domain}}/v3/{+path}
  *     v2) uri: http://0.0.0.0:8001/{{domain}}/v3/{+path}
  * Run the script from the script folder.

  Arguments: provide a single argument which is the language code for the Wikipedia project.

  Example:
  $ ./scripts/compare-sections.js en

  The output will be in the private/compare-sections folder. Since the output is much larger than
  for text extracts each page gets it's own file.
  Note: the output will be massaged to allow for easier diffing by reducing uninteresting variances
  and by adding line breaks at strategic points.
*/

const BBPromise = require('bluebird');
const fs = require('fs');
const mkdir = require('mkdirp');
const preq = require('preq');
const path = require('path');

const DELAY = 10; // delay between requests in ms
const topPagesDir = path.join(__dirname, '../private/page-lists/top-pages/wikipedia');
const outDir = path.join(__dirname, '../private/compare-sections');

let lang;
let topPages;

let oldDirName;
let newDirName;

const uriForOldMobileSections = (title, rev, lang) => {
    return `http://localhost:8888/${lang}.wikipedia.org/v1/page/mobile-sections/${encodeURIComponent(title)}/${rev}`;
};

const uriForNewSections = (title, rev, lang) => {
    return `http://localhost:8898/${lang}.wikipedia.org/v1/page/mobile-sections/${encodeURIComponent(title)}/${rev}`;
};

/**
 * Remove some values which vary between implementation but don't have anything to do with
 * sectioning.
 */
const simplifyExtractValue = (value) => {
    return value && value
        .replace(/"revision": "\w+",/, '"revision": "ZZZ",')
        .replace(/"lastmodified": "\w+",/, '"lastmodified": "ZZZ",')
        .replace(/"user": "\w+",/, '"user": "ZZZ",')
        .replace(/"gender": "\w+",/, '"gender": "ZZZ",')
        .replace(/#ImageMap_\d+_\d+/g, '#ImageMap_0_000')
        .replace(/<img src="\/\//g, '<img src="https://')
        .replace(/ srcset=\\".+?\\"/g, '')
        .replace(/ class=\\"mw-redirect\\"/g, '')
        .replace(/ id=\\"mw[-\w]+\\"/g, '')
        .replace(/#mwt\d{1,4}/g, '#mwt000')
        .replace(/ data-mw=\\"\\.+?\\}\\"/g, ' data-mw="{}"')
        // break lines for easier diffing:
        .replace(/(<h\d)/g, '\n$1')
        .replace(/(<\/h\d>)/g, '$1\n')
        .replace(/(<section)/g, '\n$1')
        .replace(/(<\/section>)/g, '$1\n')
        .replace(/(.{50}[^<>]{0,50}>?)/g, '$1\n');
    // ^ keep lines to a reasonable width (try to break near HTML tags)
};

const getExtractHtml = (response) => {
    if (response.status !== 200) {
        return `!! STATUS = ${response.status} !!\n`;
    }
    return simplifyExtractValue(JSON.stringify(response.body, null, 2));
};

const writeFile = (dir, title, rev, value) => {
    const file = fs.createWriteStream(`${dir}_${encodeURIComponent(title)}-${rev}.json`,
        { flags: 'w' });
    file.write(`${value}\n`);
    file.end();
};

const compareExtracts = (filePrefix, oldExtract, newExtract, counter, title, rev) => {
    writeFile(`${oldDirName}/${filePrefix}`, title, rev, oldExtract);
    writeFile(`${newDirName}/${filePrefix}`, title, rev, newExtract);
};

const fetchExtract = (uri) => {
    return preq.get({ uri })
    .then((response) => {
        return BBPromise.delay(DELAY, getExtractHtml(response));
    }).catch((err) => {
        return BBPromise.resolve(`!!! ${err} "${uri}" !!!`);
    });
};

const fetchAndVerify = (filePrefix, title, rev, counter, lang) => {
    process.stdout.write('.');
    let newExtract;
    return fetchExtract(uriForNewSections(title, rev, lang))
    .then((response) => {
        newExtract = response;
        return fetchExtract(uriForOldMobileSections(title, rev, lang));
    }).then((oldExtract) => {
        compareExtracts(filePrefix, oldExtract, newExtract, counter, title, rev);
    });
};

const processOneLanguage = (lang) => {
    let counter = 0;
    BBPromise.each(topPages, (page) => {
        const filePrefix = (`0000${++counter}`).slice(-4); // 0-pad
        return fetchAndVerify(filePrefix, page.title, page.rev.split('/', 1)[0], counter, lang);
    });
};

// MAIN
const arg = process.argv[2];
if (arg) {
    lang = arg;
    topPages = require(`${topPagesDir}/top-pages.${lang}.json`).items;
    oldDirName = `${outDir}/v1/${lang}`;
    newDirName = `${outDir}/v2/${lang}`;

    mkdir.sync(oldDirName);
    mkdir.sync(newDirName);

    processOneLanguage(arg);
} else {
    process.stderr.write('Error: supply one language parameter (e.g. en)!\n');
    process.exit(-1);
}
