'use strict';

const fs = require('fs');
const path = require('path');
const parse = require('csv-parse/lib/sync');
const assert = require('../../utils/assert');
const filterSpecialPages = require('../../../lib/feed/filter-special');
const mostRead = require('../../../lib/feed/most-read');

const combinedMostRead = require('./all-access-top-50').items[0].articles;
const desktopMostRead = require('./desktop-top-100').items[0].articles;

const file = fs.readFileSync(path.resolve(__dirname, '../../../static/mainpages.csv'), 'utf8');
const mainPageTitles = parse(file, 'utf8')[0];
const articles = [ { pageid: 0, ns: 0, title: 'Hello world' } ];

describe('page filtering', () => {
    it('main page filtering RegExp should handle all main page title chars', () => {
        mainPageTitles.forEach((title) => {
            assert.ok(filterSpecialPages(articles, title));
        });
    });

    it('Page with pageviews below threshold on either desktop or mobile should be omitted from results', () => {
        mostRead.filterBotTraffic(combinedMostRead, desktopMostRead).forEach((entry) => {
            assert.ok(entry.article !== "AMGTV");
        });
    });
});

