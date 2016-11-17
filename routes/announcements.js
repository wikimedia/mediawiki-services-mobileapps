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
            id: "EN1116SURVEYIOS",
            type: "survey",
            start_time: "2016-11-15T17:11:12Z",
            end_time: "2016-12-08T00:00:00Z",
            platforms: [
                "iOSApp",
            ],
            text: "Answer one question and help us improve Wikipedia.",
            action: {
                title: "Take the survey",
                url: "https://docs.google.com/forms/d/e/1FAIpQLSdaqvKojvyXGSewEZ395RPOQ6AcD3e87MZnh5pvO7phqqKwVg/viewform"
            },
            caption_HTML: "<p>Survey powered by 3rd-party service; see <a href=\"https://wikimediafoundation.org/wiki/Apps_Reader_Motivation_Survey_Privacy_Statement\">privacy statement</a>.</p>",
            countries: [
                "US",
                "CA",
                "GB"
            ]
        },
        {
            id: "EN11116SURVEYANDROID",
            type: "survey",
            start_time: "2016-12-11T00:00:00Z",
            end_time: "2016-12-13T00:00:00Z",
            platforms: [
                "AndroidApp"
            ],
            text: "Answer one question and help us improve Wikipedia.",
            action: {
                title: "Take the survey",
                url: "https://docs.google.com/forms/d/e/1FAIpQLSfqzFyCmoQBs9z8i1PQSY-8hnBpCaRFS0gWGiAvTYFf6Y8WAQ/viewform"
            },
            caption_HTML: "Survey powered by 3rd-party service; see <a href=\"https://wikimediafoundation.org/wiki/Apps_Reader_Motivation_Survey_Privacy_Statement\">privacy statement</a>.",
            countries: [
                "US",
                "CA",
                "GB"
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
        announce: req.params.domain === 'en.wikipedia.org' ? getEnwikiAnnouncements() : []
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
