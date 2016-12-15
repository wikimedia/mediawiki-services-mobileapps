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
        },
        {
            id: "EN1216DONATIONIOS",
            type: "fundraising",
            start_time: "2016-12-15T00:00:00Z",
            end_time: "2016-12-21T00:00:00Z",
            platforms: [
                "iOSApp",
            ],
            image_url: "https://upload.wikimedia.org/wikipedia/commons/3/3f/Puzzle_heart.png",
            /*eslint-disable */
            text: "We'll get right to it: Today we ask you to help Wikipedia. We're sustained by donations averaging about $15. If we all gave $3, the fundraiser would be over in an hour.",
            /*eslint-enable */
            action: {
                title: "Donate today",
                url: "https://donate.wikimedia.org/?utm_medium=WikipediaAppFeed&utm_campaign=iOS&utm_source=app_201612_heartPuzzle"
            },
            caption_HTML: "<p>By submitting, you are agreeing to our <a href=\"https://wikimediafoundation.org/wiki/Donor_policy/en\">donor privacy policy</a>.</p>",
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
            id: "EN1216DONATIONIANDROID",
            type: "fundraising",
            start_time: "2016-12-15T00:00:00Z",
            end_time: "2016-12-21T00:00:00Z",
            platforms: [
                "AndroidApp",
            ],
            image: "https://upload.wikimedia.org/wikipedia/commons/9/96/Puzzle_heart_with_Glyph.png",
            /*eslint-disable */
            text: "We'll get right to it: Today we ask you to help Wikipedia. We're sustained by donations averaging about $15. If we all gave $3, the fundraiser would be over in an hour.",
            /*eslint-enable */
            action: {
                title: "Donate today",
                url: "https://donate.wikimedia.org/?utm_medium=WikipediaAppFeed&utm_campaign=Android&utm_source=app_201612_heartPuzzle"
            },
            caption_HTML: "By submitting, you are agreeing to our <a href=\"https://wikimediafoundation.org/wiki/Donor_policy/en\">donor privacy policy</a>.",
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
