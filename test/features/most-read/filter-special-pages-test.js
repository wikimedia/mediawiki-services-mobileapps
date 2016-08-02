'use strict';

const fs = require('fs');
const path = require('path');
const parse = require('csv-parse/lib/sync');
const articles = [ { pageid: 0, ns: 0, title: 'Hello world' } ];
const blacklist = require('../../../lib/feed/blacklist');
const assert = require('../../utils/assert.js');

const file = fs.readFileSync(path.resolve(__dirname, '../../../static/mainpages.csv'), 'utf8');
const mainPageTitles = parse(file, 'utf8')[0];

describe('filter special pages', function() {
    it('main page filtering RegExp should handle all main page title chars', function() {
        mainPageTitles.forEach(function(title) {
            assert.ok(blacklist.filterSpecialPages(articles, title));
        });
    });
});

