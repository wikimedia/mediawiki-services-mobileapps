'use strict';

const sUtil = require('../lib/util');
const mUtil = require('../lib/mobile-util');

/**
 * The main router object
 */
const router = sUtil.router();

function getEnwikiAnnouncements() {
    // Notes: for iOS text: HTML is not supported.
    // iOS uses image_url instead of the image Android uses.
    return [
        {
            id: "EN0517SURVEYIOS",
            type: "survey",
            start_time: "2017-05-26T00:00:00Z",
            end_time: "2017-05-29T00:00:00Z",
            platforms: [
                "iOSApp",
            ],
            text: "Hi iOS readers,\n\nHave you been using save for later? Help us learn more about how you are using this saved articles feature by taking a short survey, so that we can continue making reading lists even better.", // eslint-disable-line max-len
            image_url: "https://upload.wikimedia.org/wikipedia/commons/8/8f/Reading_list_survey_-_iOS.png",
            action: {
                title: "Take survey",
                url: "https://docs.google.com/a/wikimedia.org/forms/d/e/1FAIpQLScYphlKSI5DCZAkdgC3QfzqZbpj3q3ohuvF8zptO-p5j-xDRA/viewform"
            },
            caption_HTML: "<p>Hosted by a third-party service. See the <a href=\"https://m.wikimediafoundation.org/wiki/Mobile_User_Testing_Recruitment_Survey_Privacy_Statement\">privacy statement</a> for information on data handling.</p>",
            countries: [
                "US",
                "CA",
                "GB",
                "IE",
                "AU",
                "NZ"
            ]
        },
        {
            id: "EN0517SURVEYANDROID",
            type: "survey",
            start_time: "2017-05-26T00:00:00Z",
            end_time: "2017-05-29T00:00:00Z",
            platforms: [
                "AndroidApp"
            ],
            text: "Hi Android readers,<br><br>Have you been using <b>reading lists</b>? Help us learn more about how you are using them by taking a short survey, so that we can continue making reading lists even better.", // eslint-disable-line max-len
            image: "https://upload.wikimedia.org/wikipedia/commons/5/52/Reading_list_survey.png",
            action: {
                title: "Take survey",
                url: "https://docs.google.com/a/wikimedia.org/forms/d/e/1FAIpQLSeAbWTd9G4GTzAHJtV55HmC6I-LC3as0zWTCneGuLyj3Z6gMw/viewform"
            },
            caption_HTML: "Survey powered by 3rd-party service. See <a href=\"https://m.wikimediafoundation.org/wiki/Mobile_User_Testing_Recruitment_Survey_Privacy_Statement\">privacy statement</a>.",
            countries: [
                "US",
                "CA",
                "GB",
                "IE",
                "AU",
                "NZ"
            ]
        }
    ];
}

/**
 * GET /announcements
 * Gets the announcements available for clients
 */
router.get('/announcements', (req, res) => {
    const json = {
        announce: mUtil.isEnglishWikipedia(req.params.domain) ? getEnwikiAnnouncements() : []
    };
    const hash = mUtil.hashCode(JSON.stringify(json));

    res.status(200);
    mUtil.setContentType(res, mUtil.CONTENT_TYPES.announcements);
    mUtil.setETag(res, hash);
    res.set('cache-control', 'public, max-age=7200, s-maxage=14400');
    res.json(json);
});

module.exports = function() {

    return {
        path: '/feed',
        api_version: 1,
        router
    };

};
