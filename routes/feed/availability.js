'use strict';

const mUtil = require('../../lib/mobile-util');
const sUtil = require('../../lib/util');
const tfaLangs = require('../../lib/feed/featured').supportedLangs;
const newsLangs = Object.keys(require('../../etc/feed/news-sites'));
const onThisDayLangs = Object.keys(require('../../lib/feed/on-this-day.languages').languages);

const router = sUtil.router();

router.get('/availability', (req, res) => {
    const response = {
        todays_featured_article: tfaLangs,
        most_read: ['*'],
        picture_of_the_day: ['*'],
        in_the_news: newsLangs,
        on_this_day: onThisDayLangs
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
