#!/usr/bin/env node

'use strict';

const BBPromise = require('bluebird');
const exec = BBPromise.promisify(require('child_process').exec);
const fs = require("fs");
const preq = require('preq');

const lang = 'en'; // prepped for 'en' and 'zh'
const topMonthlyPageViews = `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/${lang}.wikipedia/all-access/2017/06/all-days`; // eslint-disable-line max-len
const blacklist = [
    'Main_Page', // en: main page
    'Special%3ASearch', // already encoded
    'Wikipedia:首页', // zh: main page
    '台灣Youtuber訂閱人數排行榜' // zh: deleted page
];
const PAGE_FILE = `../private/top-pages/top-pages.${lang}.json`;
const GZIP = 'gzip -6';
const SPECIAL = 'Special:';
const SPECIAL2 = 'special:';
const PARSOID_BASE_URI = `https://${lang}.wikipedia.org/api/rest_v1/page/html`;
const LOCAL_MCS_BASE_URI = `http://localhost:6927/${lang}.wikipedia.org/v1/page/read-html`;

const headers = ['title', 'parsoid', 'parsoid-gz', 'read-html', 'read-html-gz'];
const measurements = [];

const fixTitleForRequest = (pageTitle) => {
    return encodeURIComponent(pageTitle);
};

const processEndpoint = (endpointLabel, baseUri, page, measurement) => {
    const requestTitle = fixTitleForRequest(page.title);
    const uri = `${baseUri}/${requestTitle}/${page.rev}`;
    const fileName = requestTitle;
    const cmd = `curl -s "${uri}" -o "${fileName}"`;
    return exec(cmd)
    .then((rsp) => {
        const stats = fs.statSync(fileName);
        measurement.push(stats.size);
        return exec(`${GZIP} "${fileName}"`);
    })
    .then((rsp) => {
        const stats = fs.statSync(`${fileName}.gz`);
        measurement.push(stats.size);
        fs.unlinkSync(`${fileName}.gz`);
        return BBPromise.resolve(measurement);
    })
    .catch((err) => {
        process.stderr.write(`ERROR getting parsoid ${page.title}: ${err}`);
    });
};

const processParsoid = (page, measurement) => {
    return processEndpoint('parsoid', PARSOID_BASE_URI, page, measurement);
};

const processReadHtml = (page, measurement) => {
    return processEndpoint('read-html', LOCAL_MCS_BASE_URI, page, measurement);
};

const printResultSummary = () => {
    process.stdout.write(`\n\n${headers.join('\t')}\n`);
    measurements.forEach((measurement) => {
        process.stdout.write(`${measurement.join('\t')}\n`);
    });
};

const processAllPages = () => {
    const pages = require(PAGE_FILE).items;
    BBPromise.map(pages, (page) => {
        const measurement = [ page.title ];
        return processParsoid(page, measurement)
        .then(() => {
            return processReadHtml(page, measurement);
        })
        .then(() => {
            process.stdout.write('.');
            measurements.push(measurement);
            return measurement;
        });
    }, { concurrency: 1 })
    .then(() => {
        printResultSummary();
    });
};

const writePages = (myPages) => {
    const logger = fs.createWriteStream(PAGE_FILE, { flags: 'w' });
    logger.write(`{ "items": [\n`);
    myPages.forEach((page, index, array) => {
        const comma = (index < array.length - 1) ? ',' : '';
        const title = page.title && page.title.replace(/"/g, '\\"');
        logger.write(`  { "title": "${title}", "rev": "${page.rev}" }${comma}\n`);
    });
    logger.write(`]}\n`);
    logger.end();
};

const getETags = (myPages) => {
    return BBPromise.map(myPages, (page) => {
        const cmd = `curl --head "${PARSOID_BASE_URI}/${fixTitleForRequest(page.title)}"`;
        return exec(cmd)
        .then((rsp) => {
            const etagMatch = /^ETag:\s+W\/"(\S+?)"$/m.exec(rsp);
            process.stdout.write('.');
            page.rev = etagMatch[1];
            return page;
        })
        .catch((err) => {
            process.stderr.write(`ERROR getting parsoid ${page.title}: ${err}`);
        });
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
                    && !blacklist.includes(title));
        }).map((article) => {
            return { "title": article.article };
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
    if (arg === '-s') {
        getTopPageViews();
    } else {
        process.stderr.write(`Error: unrecognized parameter!`);
        process.exit(-1);
    }
} else {
    processAllPages();
}
