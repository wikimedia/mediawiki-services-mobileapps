'use strict';

const domino = require('domino');
const assert = require('../../utils/assert');
const news = require('../../../lib/feed/news');
const summUrl = require('../../../lib/mobile-util').getRbPageSummaryUrl;
const rbTemplate = require('../../utils/testUtil').rbTemplate;
const fixtures = require('./news-fixtures');

describe('news-unit', () => {
    const enwiki = 'en.wikipedia.org';

    const testStoryObj = {
        story: fixtures.newsHtml4,
        links: [
            { $merge: [ summUrl(rbTemplate, enwiki, '100_metres_hurdles') ] },
            { $merge: [ summUrl(rbTemplate, enwiki, 'Sport_of_athletics') ] },
            { $merge: [ summUrl(rbTemplate, enwiki, 'Kendra_Harrison') ] },
            { $merge: [ summUrl(rbTemplate, enwiki,
                `Women's_100_metres_hurdles_world_record_progression`) ]
            },
            { $merge: [ summUrl(rbTemplate, enwiki, 'London_Grand_Prix') ] }
        ]
    };

    it('News story constructed correctly (duplicate titles handled correctly)', () => {
        const html = domino.createDocument(fixtures.newsHtml3).getElementsByTagName('li')[0];
        const story = news.constructStory(rbTemplate, 'en.wikipedia.org', 'en', html);
        assert.deepEqual(story, testStoryObj);
    });
});
