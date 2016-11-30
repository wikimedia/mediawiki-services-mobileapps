'use strict';

const sUtil = require('../lib/util');
const mUtil = require('../lib/mobile-util');

/**
 * The main router object
 */
const router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
let app; // jscs:ignore disallowUnusedVariables

function getEnwikiAnnouncements() {
    return {
        announce: [
            {
                id: "EN1116SURVEYIOS",
                type: "survey",
                start_time: "2016-11-15T17:11:12Z",
                end_time: "2016-12-10T00:00:00Z",
                platforms: [
                    "iOSApp",
                ],
                text: "Answer three questions and help us improve Wikipedia.",
                action: {
                    title: "Take the survey",
                    url: "https://docs.google.com/forms/d/e/1FAIpQLSdaqvKojvyXGSewEZ395RPOQ6AcD3e87MZnh5pvO7phqqKwVg/viewform"
                },
                caption_HTML: "<p>Survey powered by 3rd-party service; see privacy statement. <a href=\"https://wikimediafoundation.org/wiki/Apps_Reader_Motivation_Survey_Privacy_Statement\">Privacy</a>.</p>",
                countries: [
                    "US",
                    "CA",
                    "GB"
                ]
            },
            {
                id: "EN11116SURVEYANDROID",
                type: "survey",
                start_time: "2016-11-15T17:11:12Z",
                end_time: "2016-12-10T00:00:00Z",
                platforms: [
                    "AndroidApp"
                ],
                text: "Answer three questions and help us improve Wikipedia.",
                action: {
                    title: "Take the survey",
                    url: "https://docs.google.com/forms/d/e/1FAIpQLSdaqvKojvyXGSewEZ395RPOQ6AcD3e87MZnh5pvO7phqqKwVg/viewform"
                },
                caption_HTML: "<p>Survey powered by 3rd-party service; see privacy statement. <a href=\"https://wikimediafoundation.org/wiki/Apps_Reader_Motivation_Survey_Privacy_Statement\">Privacy</a>.</p>",
                countries: [
                    "US",
                    "CA",
                    "GB"
                ]
            }
        ]
    };
}

/**
 * GET /announcements
 * Gets the announcements available for clients
 */
router.get('/announcements', function (req, res) {
    let json = (req.params.domain === 'en.wikipedia.org') ? getEnwikiAnnouncements() : {announce: []};
    const hash = mUtil.hashCode(JSON.stringify(json));

    res.status(200);
    mUtil.setETag(req, res, hash);
    mUtil.setContentType(res, mUtil.CONTENT_TYPES.announcements);
    res.json(json);
});

module.exports = function (appObj) {

    app = appObj;

    return {
        path: '/feed',
        api_version: 1,
        router: router
    };

};
