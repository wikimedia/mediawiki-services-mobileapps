'use strict';

const mUtil = require('../../lib/mobile-util');
const sUtil = require('../../lib/util');
const tfaDomains = require('../../lib/feed/featured').supportedDomains;
const newsLangs = Object.keys(require('../../etc/feed/news-sites'));
const onThisDayLangs = Object.keys(require('../../lib/feed/on-this-day.languages').languages);

const router = sUtil.router();

function langCodesToWikipediaDomains(langCodes) {
    return langCodes.map(lang => `${lang}.wikipedia.org`);
}

router.get('/availability', (req, res) => {
    const response = {
        todays_featured_article: tfaDomains,
        most_read: langCodesToWikipediaDomains(['*']),
        picture_of_the_day: langCodesToWikipediaDomains(['*']),
        in_the_news: langCodesToWikipediaDomains(newsLangs),
        on_this_day: langCodesToWikipediaDomains(onThisDayLangs)
    };
    res.status(200);
    mUtil.setETag(res,  mUtil.hashCode(JSON.stringify(response)));
    mUtil.setContentType(res, mUtil.CONTENT_TYPES.availability);
    res.json(response).end();
});

module.exports = function(appObj) {
    return {
        path: '/feed',
        api_version: 1,
        router
    };
};
