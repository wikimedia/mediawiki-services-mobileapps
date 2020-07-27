#!/usr/bin/env node

'use strict';

const BBPromise = require('bluebird');
const fs = require('fs');
const preq = require('preq');
const path = require('path');

// A list of titles persistently in the top results per pageviews but that appear to have few
// human viewers based on their traffic being almost all mobile or almost all non-mobile.
// See https://phabricator.wikimedia.org/T124716#2080637.
const DISALLOWED = [
    '-',
    'Test_card',
    'Web_scraping',
    'XHamster',
    'Java_(programming_language)',
    'Images/upload/bel.jpg',
    'Superintelligence:_Paths,_Dangers,_Strategies',
    'Okto',
    'Proyecto_40',
    'AMGTV',
    'Lali_Espósito',
    'La7',
    'Vagina',
    'کس', // mznwiki
    'مقعد', // mznwiki
];

const SPECIAL = 'Special:';
const SPECIAL2 = 'special:';
const PROJECT = 'wikipedia';
const YEAR = '2017';
const MONTH = '06';
const OUTPUT_DIR = path.join(__dirname, `../private/page-lists/top-pages/${PROJECT}`);

// Will be set later
let lang;
let topMonthlyPageViews;
let outputFile;
let parsoidBaseUri;

const fixTitleForRequest = (pageTitle) => {
    return encodeURIComponent(pageTitle);
};

const uriForParsoid = (pageTitle) => {
    return `${parsoidBaseUri}/${fixTitleForRequest(pageTitle)}`;
};

const writePages = (myPages) => {
    const logger = fs.createWriteStream(outputFile, { flags: 'w' });
    logger.write('{ "items": [\n');
    myPages.forEach((page, index, array) => {
        if (page) {
            const comma = (index < array.length - 1) ? ',' : '';
            const title = page.title && page.title.replace(/"/g, '\\"');
            logger.write(`  { "title": "${title}", "rev": "${page.rev}" }${comma}\n`);
        }
    });
    logger.write(']}\n');
    logger.end();
};

const processOnePage = (page) => {
    process.stdout.write('.');
    return preq.get({ uri: uriForParsoid(page.title) })
    .then((rsp) => {
        return BBPromise.delay(1, rsp);
    }).then((rsp) => {
        if (rsp.status !== 200) {
            if (rsp.status === 302) { // redirect through 302
                page.title = rsp.headers.location;
                return processOnePage(page);
            }
            process.stderr.write(` WARNING: skipping parsoid for ${page.title}!`);
            return BBPromise.resolve();
        }
        const contentLocation = rsp.headers['content-location'];
        if (contentLocation) {
            page.title = decodeURIComponent(
                contentLocation.substring(contentLocation.lastIndexOf('/') + 1));
        }
        const etag = rsp.headers.etag;
        const revMatch = /"(\S+?)"/m.exec(etag);
        page.rev = revMatch[1].split('/')[0];
        return page;
    }).catch((err) => {
        if (err.status === 504) {
            process.stderr.write(` Timeout for ${page.title}: ${uriForParsoid(page.title)}! `);
            // time out encountered: wait a few seconds and try again
            return BBPromise.delay(2000).then(() => processOnePage(page));
        } else {
            process.stderr.write(`
ERROR getting metadata for ${page.title}: ${err.status}: ${err.body.detail}
`);
        }
    });
};

const getETags = (myPages) => {
    return BBPromise.map(myPages, (page) => {
        return processOnePage(page);
    }, { concurrency: 1 })
    .then((myPages) => {
        writePages(myPages);
    });
};

const getTopPageViews = () => {
    return preq.get({ uri: topMonthlyPageViews })
    .then((rsp) => {
        return rsp.body.items[0].articles.filter((article) => {
            const title = article.article;
            return (title.indexOf(SPECIAL) !== 0 && title.indexOf(SPECIAL2) !== 0
                && !DISALLOWED.includes(title));
        }).map((article) => {
            return { title: article.article };
        });
    }).catch((err) => {
        process.stderr.write(`ERROR: could not get top monthly page views: ${err}`);
    }).then((myPages) => {
        getETags(myPages);
    });
};

// MAIN
const arg = process.argv[2];
if (arg) {
    lang = arg;
    topMonthlyPageViews = `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/${lang}.${PROJECT}/all-access/${YEAR}/${MONTH}/all-days`;
    outputFile = path.join(OUTPUT_DIR, `top-pages.${lang}.json`);
    parsoidBaseUri = `https://${lang}.${PROJECT}.org/api/rest_v1/page/html`;

    getTopPageViews();
}
