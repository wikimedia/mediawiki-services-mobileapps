#!/usr/bin/env node

'use strict';

const BBPromise = require('bluebird');
const domino = require('domino');
const preq = require('preq');
const parseRssUrl = BBPromise.promisify(require('rss-parser').parseURL);
const underscore = require('underscore');
const path = require('path');

//
// LANGUAGES SECTION start
//
const wikiquoteLanguages = require(path.join(__dirname, '../private/wikiquotes.json'));
const wiktionaryLanguages = require(path.join(__dirname, '../private/wiktionaries.json'));
const wikipediaLanguagesRawList = require(path.join(__dirname, '../private/languages_list.json'));

const prepareWikipediaLanguageCodes = () => {
    delete wikipediaLanguagesRawList['Simplified Chinese']; // skip lang variants
    delete wikipediaLanguagesRawList['Traditional Chinese'];
    return underscore.values(wikipediaLanguagesRawList).sort();
};
const wikipediaLanguages = prepareWikipediaLanguageCodes();
//
// LANGUAGES SECTION end
//

const ModeEnum = Object.freeze({ wikitext: 0, expandTemplates: 1, rssFeed: 2 });
const mode = ModeEnum.rssFeed;

const candidates = [];
const errNotConfigured = [];
const errElse = [];
const errHttp = [];


const cleanUpHtml = html => html.replace(/<!--[\s\S]*?-->/mg, '').replace(/\n/mg, '');

/* eslint-disable no-console */

const lookForBoldAnchor = (document, projectLang, html) => {
    const boldAnchor = document.querySelector('b > a, a > b');
    if (boldAnchor) {
        const tfaTitle = boldAnchor.getAttribute('title');
        console.log(`${projectLang}: ${tfaTitle}`);
        candidates.push(projectLang);
    } else {
        console.log(`${projectLang}: ERROR: bold anchor not found: else: ${html}`);
        errElse.push(projectLang);
    }
};

const getWikitext = (projectLang, feature) => {
    const baseUri = `https://${projectLang}.${feature.projectFamily}.org`;
    const queryParams1 = `action=query&format=json&prop=revisions&rvprop=content`;
    const queryParams2 = `&rvslots=main&titles=MediaWiki%3A${feature.title}`;
    const uri = `${baseUri}/w/api.php?${queryParams1}${queryParams2}`;

    return preq.get({ uri })
        .then((rsp) => {
            const pages = rsp.body.query && rsp.body.query.pages;
            if (!pages) {
                errNotConfigured.push(projectLang);
                return;
            }
            const firstPageKey = Object.keys(pages)[0];
            if (Object.prototype.hasOwnProperty.call(pages[firstPageKey], 'missing')) {
                errNotConfigured.push(projectLang);
                return;
            }

            const wikiText = pages[firstPageKey].revisions[0].slots.main['*'];
            if (wikiText) {
                console.log(`${projectLang}: ${wikiText}`);
                candidates.push(projectLang);
            } else {
                errNotConfigured.push(projectLang);
            }
        })
        .catch((err) => {
            console.log(`${projectLang} ERROR: ${err}`);
            errHttp.push(projectLang);
        });
};

const doubleExpandTemplate = (projectLang, feature) => {
    const baseUri = `https://${projectLang}.${feature.projectFamily}.org`;
    const wikiText = encodeURIComponent(
        `{{#ifexist:{{int:${feature.title}}}|{{ {{int:${feature.title}}} }} }}`);
    const queryParams = `action=parse&format=json&prop=text&contentmodel=wikitext&text=${wikiText}`;
    const uri = `${baseUri}/w/api.php?${queryParams}`;

    return preq.get({ uri })
        .then((rsp) => {
            const html = cleanUpHtml(rsp.body.parse.text['*']);
            if (html === '') {
                errNotConfigured.push(projectLang);
            } else if (feature.shouldLookForBoldAnchor) {
                lookForBoldAnchor(domino.createDocument(html), projectLang, html);
            } else {
                console.log(`${projectLang}: ${html}`);
                candidates.push(projectLang);
            }
        })
        .catch((err) => {
            console.log(`${projectLang} ERROR: ${err}`);
            errHttp.push(projectLang);
        });
};

const getRssFeed = (projectLang, feature) => {
    const baseUri = `https://${projectLang}.${feature.projectFamily}.org`;
    const queryParams = `action=featuredfeed&feed=${feature.feedName}&feedformat=rss`;
    const uri = `${baseUri}/w/api.php?${queryParams}`;
    const contentPool = [];
    const indices = [];

    return parseRssUrl(uri)
    .then((response) => {
        let languageCode;
        // console.log(`${projectLang}: ${response.feed.title}`);
        response.feed.entries.forEach((entry) => {
            const index = underscore.indexOf(contentPool, entry.content);
            // console.log(`${entry.title}: ${index}: ${entry.link}`);
            if (index >= 0) {
                indices.push(index);
            } else {
                contentPool.push(entry.content);
                indices.push(contentPool.length - 1);
            }
            languageCode = entry.link.substr(entry.link.lastIndexOf('/') + 1);
        });
        // in a few instances the languageCode differs from the projectLang (Example: no/nb)
        console.log(`${projectLang}/${languageCode}: ${indices}: ${uri}`);
        candidates.push(projectLang);
    })
    .catch((err) => {
        if (err.message === 'RSS 1.0 parsing not yet implemented.') {
            errNotConfigured.push(projectLang);
        } else {
            console.log(`${projectLang}: ERROR: ${uri}: ${err}`);
            errHttp.push(projectLang);
        }
    });
};

const printResultSummary = () => {
    console.log(`candidates: ${candidates.length}: ${JSON.stringify(candidates.sort())}`);
    console.log(`errNotConfigured: ${errNotConfigured.length}: ${errNotConfigured.sort()}`);
    console.log(`errElse: ${errElse.length}: ${errElse.sort()}`);
    console.log(`retryQueue: ${errHttp.length}: ${errHttp.sort()}`);
};

const processAllLanguages = (feature) => {
    BBPromise.map(feature.projectLangs, (projectLang) => {
        if (mode === ModeEnum.expandTemplates) {
            return doubleExpandTemplate(projectLang, feature);
        } else if (mode === ModeEnum.wikitext) {
            return getWikitext(projectLang, feature);
        } else {
            return getRssFeed(projectLang, feature);
        }
    }, { concurrency: 1 })
    .then(() => {
        printResultSummary();
    });
};

// MAIN
const featureMap = {
    tfa: {
        projectFamily: 'wikipedia',
        projectLangs: wikipediaLanguages,
        feedName: 'featured',
        title: 'Ffeed-featured-page',
        shouldLookForBoldAnchor: true
    },
    dyk: {
        projectFamily: 'wikipedia',
        projectLangs: wikipediaLanguages,
        feedName: 'dyk',
        title: 'Ffeed-dyk-page'
    },
    potd: {
        projectFamily: 'wikipedia',
        projectLangs: wikipediaLanguages,
        feedName: 'potd',
        title: 'Ffeed-potd-page',
    },
    motd: {
        projectFamily: 'wikipedia',
        projectLangs: wikipediaLanguages,
        feedName: 'motd',
        title: 'Ffeed-motd-page'
    },
    qotd: {
        projectFamily: 'wikiquote',
        projectLangs: wikiquoteLanguages,
        feedName: 'qotd',
        title: 'Ffeed-qotd-page'
    },
    wotd: {
        projectFamily: 'wiktionary',
        projectLangs: wiktionaryLanguages,
        feedName: 'wotd',
        title: 'Ffeed-wotd-page'
    },
    fwotd: {
        projectFamily: 'wiktionary',
        projectLangs: wiktionaryLanguages,
        feedName: 'fwotd',
        title: 'Ffeed-fwotd-page'
    }
};

const feature = featureMap[process.argv[2]];
if (feature) {
    processAllLanguages(feature);
} else {
    console.error(`Error: need to specify one of ${Object.keys(featureMap)}!`);
    process.exit(-1);
}
