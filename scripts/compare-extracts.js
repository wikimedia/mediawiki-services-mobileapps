#!/usr/bin/env node

'use strict';

/*
  Notes:
  * Start a local MCS instance for the "new" version before running this script.
  * Run the script from the script folder.

  Arguments: provide a single argument which is the language code for
  the Wikipedia project.

  Example:
  $ npm start
  In another terminal run:
  $ cd scripts
  $ ./compare-extracts.js en

  The output will be in the private/extracts folder.
*/

const BBPromise = require('bluebird');
const fs = require('fs');
const preq = require('preq');

const DELAY = 100; // delay between requests in ms
const topPagesDir = '../private/top-pages';
const outDir = '../private/extracts';

let lang;
let topPages;

let oldFileName;
let newFileName;
let htmlFileName;

let oldFile;
let newFile;
let htmlFile;

const uriForWikiLink = (title, lang) => {
    return `https://${lang}.m.wikipedia.org/wiki/${title}`;
};

const uriForProdSummary = (title, lang) => {
    return `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
};

const uriForLocalSummary = (title, lang) => {
    return `http://localhost:6927/${lang}.wikipedia.org/v1/page/summary/${encodeURIComponent(title)}`;
};

const outputStart = () => {
    htmlFile.write(`<html>\n`);
    htmlFile.write(`<head>\n`);
    htmlFile.write(`<meta charset="UTF-8"/>\n`);
    htmlFile.write(`<link rel="StyleSheet" href="./static/compare-table.css" />\n`);
    htmlFile.write(`</head>\n`);
    htmlFile.write(`<body>\n`);
    htmlFile.write(`<h2>Extract comparison for top pages in ${lang}.wikipedia.org</h2>\n`);
    htmlFile.write(`<table>\n`);
    htmlFile.write(`<tr>\n`);
    htmlFile.write(`<th class="titleColumn">Title</th>\n`);
    htmlFile.write(`<th class="valueColumn">Old</th>\n`);
    htmlFile.write(`<th class="valueColumn">New</th>\n`);
    htmlFile.write(`</tr>\n`);
};

const outputEnd = () => {
    htmlFile.write(`</table>\n`);
    htmlFile.write(`</body>\n`);
    htmlFile.write(`</html>\n`);

    oldFile.end();
    newFile.end();
    htmlFile.end();
};

const compareExtractsHTML = (oldExtract, newExtract, counter, title, lang) => {
    const displayTitle = title.replace(/_/g, ' ');
    const wikiLink = uriForWikiLink(title, lang);
    const positionLink = `<a id="${counter}" href="#${counter}">${counter}</a>`;
    htmlFile.write(`<tr><td>${positionLink} <a href="${wikiLink}">${displayTitle}</a></td>\n`);
    if (oldExtract !== newExtract) {
        htmlFile.write(`<td>${oldExtract}</td>\n`);
        htmlFile.write(`<td>${newExtract}</td>\n`);
    } else {
        htmlFile.write(`<td class="same-old">${oldExtract}</td>\n`);
        htmlFile.write(`<td class="same-new">${newExtract}</td>\n`);
    }
    htmlFile.write(`</tr>\n`);
};

/**
 * Make the src and srcset values https URLs instead of protocol-relative URLs.
 * Only needed if the HTML files are viewed locally (=base URL protocol is file) and you care
 * about seeing the images.
 */
const fixImgSources = (value) => {
    return value && value
        .replace(/<img src="\/\//g, '<img src="https://')
        .replace(/srcset="\/\//g, 'srcset="https://')
        .replace(/ 2x, \/\//g, ' 2x, https://');
};

const getExtractHtml = (response) => {
    if (response.status !== 200) {
        return `!! STATUS = ${response.status} !!\n`;
    }
    return response.body && fixImgSources(response.body.extract_html);
};

const writeFile = (file, title, value) => {
    file.write(`== ${title}\n`);
    file.write(`${value}\n`);
};

const compareExtracts = (oldExtract, newExtract, counter, title, lang) => {
    compareExtractsHTML(oldExtract, newExtract, counter, title, lang);
    writeFile(oldFile, title, oldExtract);
    writeFile(newFile, title, newExtract);
};

const fetchExtract = (uri) => {
    return preq.get({ uri })
    .then((response) => {
        return BBPromise.delay(DELAY, getExtractHtml(response));
    }).catch((err) => {
        return BBPromise.resolve(`!!! ${err} "${uri}" !!!`);
    });
};

const fetchAndVerify = (title, counter, lang) => {
    process.stdout.write('.');
    let newExtract;
    return fetchExtract(uriForLocalSummary(title, lang))
    .then((response) => {
        newExtract = response;
        return fetchExtract(uriForProdSummary(title, lang));
    }).then((oldExtract) => {
        compareExtracts(oldExtract, newExtract, counter, title, lang);
    });
};

const processOneLanguage = (lang) => {
    let counter = 0;
    outputStart();
    BBPromise.each(topPages, (page) => {
        return fetchAndVerify(page.title, ++counter, lang);
    })
    .then(() => {
        outputEnd();
    });
};

// MAIN
const arg = process.argv[2];
if (arg) {
    lang = arg;
    topPages = require(`${topPagesDir}/top-pages.${lang}.json`).items;
    oldFileName = `${outDir}/${lang}.v1.txt`;
    newFileName = `${outDir}/${lang}.v2.txt`;
    htmlFileName = `${outDir}/${lang}.html`;

    oldFile = fs.createWriteStream(oldFileName, { flags: 'w' });
    newFile = fs.createWriteStream(newFileName, { flags: 'w' });
    htmlFile = fs.createWriteStream(htmlFileName, { flags: 'w' });

    processOneLanguage(arg);
} else {
    process.stderr.write(`Error: supply one language parameter (e.g. en)!\n`);
    process.exit(-1);
}
