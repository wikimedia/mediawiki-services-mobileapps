#!/usr/bin/env node

'use strict';

const BBPromise = require('bluebird');
const exec = BBPromise.promisify(require('child_process').exec);
const fs = require('fs');
const path = require('path');

const lang = 'en'; // prepped for 'en' and 'zh'
const TOP_PAGES_DIR = path.join(__dirname, '../private/page-lists/top-pages/wikipedia');
const TOP_PAGES_FILE = path.join(TOP_PAGES_DIR, `top-pages.${lang}.json`);
const GZIP = 'gzip -6';
const PARSOID_BASE_URI = `https://${lang}.wikipedia.org/api/rest_v1/page/html`;
const LOCAL_MCS_BASE_URI = `http://localhost:8888/${lang}.wikipedia.org/v1/page/mobile-html`;

const headers = ['title', 'parsoid', 'parsoid-gz', 'mobile-html', 'mobile-html-gz'];
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
    return processEndpoint('mobile-html', LOCAL_MCS_BASE_URI, page, measurement);
};

const printResultSummary = () => {
    process.stdout.write(`\n\n${headers.join('\t')}\n`);
    measurements.forEach((measurement) => {
        process.stdout.write(`${measurement.join('\t')}\n`);
    });
};

const processAllPages = () => {
    const pages = require(TOP_PAGES_FILE).items;
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

// MAIN
const arg = process.argv[2];
if (arg) {
    process.stderr.write('Error: unrecognized parameter!');
    process.exit(-1);
} else {
    processAllPages();
}
