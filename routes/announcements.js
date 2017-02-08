'use strict';

const sUtil = require('../lib/util');
const mUtil = require('../lib/mobile-util');

/**
 * The main router object
 */
const router = sUtil.router();

function getEnwikiAnnouncements() {
    return [
        {
            id: "EN0217SURVEYIOS",
            type: "survey",
            start_time: "2017-02-09T00:00:00Z",
            end_time: "2017-02-14T00:00:00Z",
            platforms: [
                "iOSApp",
            ],
            text: "Help to improve the Wikipedia mobile apps by signing up to be a user tester. Take a quick survey to participate in an upcoming study or research interview.", // eslint-disable-line max-len
            action: {
                title: "Sign up",
                url: "https://goo.gl/forms/AjwqEK42MaHMUsoN2"
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
            id: "EN0217SURVEYANDROID",
            type: "survey",
            start_time: "2017-02-11T00:00:00Z",
            end_time: "2017-02-13T00:00:00Z",
            platforms: [
                "AndroidApp"
            ],
            text: "Help to improve the Wikipedia mobile apps by signing up to be a user tester. Take a quick survey to participate in an upcoming study or research interview.", // eslint-disable-line max-len
            action: {
                title: "Sign up",
                url: "https://goo.gl/forms/AjwqEK42MaHMUsoN2"
            },
            caption_HTML: "Hosted by a third-party service. See the <a href=\"https://m.wikimediafoundation.org/wiki/Mobile_User_Testing_Recruitment_Survey_Privacy_Statement\">privacy statement</a> for information on data handling.",
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
