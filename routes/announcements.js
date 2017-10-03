'use strict';

const sUtil = require('../lib/util');
const mUtil = require('../lib/mobile-util');

/**
 * The main router object
 */
const router = sUtil.router();

function getFrwikiAnnouncements() {
    // Notes: for iOS 'text' and 'action.title': HTML is not supported.
    // iOS uses image_url instead of the image Android uses.
    // iOS caption_HTML should be wrapped in <p> tag.

    // image_url: "https://upload.wikimedia.org/wikipedia/commons/8/8f/Reading_list_survey_-_iOS.png",
    // image: "https://upload.wikimedia.org/wikipedia/commons/5/52/Reading_list_survey.png",

    return [
        {
            id: "FR1017FRIOS",
            type: "fundraising",
            start_time: "2017-10-05T00:00:00Z",
            end_time: "2017-10-19T00:00:00Z",
            platforms: [
                "iOSApp",
            ],
            text: "Le moment est venu de faire appel à vous.\n\nChers lecteurs en France, nous irons droit au but : aujourd’hui, nous vous demandons d’aider Wikipédia. Afin de protéger notre indépendance, nous ne diffuserons jamais de publicité. Nous sommes soutenus par des dons d’environ 10 € en moyenne. Nos lecteurs sont très peu nombreux à faire des dons. Si chaque personne qui lit ce message donnait 2 €, cela permettrait à Wikipédia de continuer à prospérer de nombreuses années. Le prix d’un café, c’est tout ce dont nous avons besoin. Si Wikipédia vous est utile, prenez une minute afin de maintenir cette plate-forme en ligne et lui permettre de continuer de croître. Merci.", // eslint-disable-line max-len
            action: {
                title: "Continuer",
                url: "https://donate.wikimedia.org/?uselang=fr&utm_medium=WikipediaAppFeed&utm_campaign=iOS&utm_source=app_201710_FR_control"
            },
            caption_HTML: "<p><a href='https://wikimediafoundation.org/wiki/Special:LandingCheck?basic=true&landing_page=Problems_donating&country=FR&language=fr&uselang=fr&utm_medium=sitenotice&utm_campaign=test&utm_source=frFR_dsk_p1_lg_control_17_09_14'>Un problème pour faire un don ?</a> | <a href='https://wikimediafoundation.org/wiki/Special:LandingCheck?basic=true&landing_page=Ways_to_Give&country=FR&language=fr&uselang=fr&utm_medium=sitenotice&utm_campaign=test&utm_source=frFR_dsk_p1_lg_control_17_09_14'>Autres façons de donner</a> | <a href='https://wikimediafoundation.org/wiki/Special:LandingCheck?basic=true&landing_page=FAQ&country=FR&language=fr&uselang=fr&utm_medium=sitenotice&utm_campaign=test&utm_source=frFR_dsk_p1_lg_control_17_09_14'>Questions fréquentes</a></p>",
            countries: [
                "FR"
            ]
        },
        {
            id: "FR1017FRANDROID",
            type: "fundraising",
            start_time: "2017-10-05T00:00:00Z",
            end_time: "2017-10-19T00:00:00Z",
            platforms: [
                "AndroidApp"
            ],
            text: "Le moment est venu de faire appel à vous.<br><br>Chers lecteurs en France, nous irons droit au but : aujourd’hui, nous vous demandons d’aider Wikipédia. Afin de protéger notre indépendance, nous ne diffuserons jamais de publicité. Nous sommes soutenus par des dons d’environ 10 € en moyenne. Nos lecteurs sont très peu nombreux à faire des dons. Si chaque personne qui lit ce message donnait 2 €, cela permettrait à Wikipédia de continuer à prospérer de nombreuses années. Le prix d’un café, c’est tout ce dont nous avons besoin. Si Wikipédia vous est utile, prenez une minute afin de maintenir cette plate-forme en ligne et lui permettre de continuer de croître. Merci.", // eslint-disable-line max-len
            action: {
                title: "Continuer",
                url: "https://donate.wikimedia.org/?uselang=fr&utm_medium=WikipediaAppFeed&utm_campaign=Android&utm_source=app_201710_FR_control"
            },
            caption_HTML: "<a href='https://wikimediafoundation.org/wiki/Special:LandingCheck?basic=true&landing_page=Problems_donating&country=FR&language=fr&uselang=fr&utm_medium=sitenotice&utm_campaign=test&utm_source=frFR_dsk_p1_lg_control_17_09_14'>Un problème pour faire un don ?</a> | <a href='https://wikimediafoundation.org/wiki/Special:LandingCheck?basic=true&landing_page=Ways_to_Give&country=FR&language=fr&uselang=fr&utm_medium=sitenotice&utm_campaign=test&utm_source=frFR_dsk_p1_lg_control_17_09_14'>Autres façons de donner</a> | <a href='https://wikimediafoundation.org/wiki/Special:LandingCheck?basic=true&landing_page=FAQ&country=FR&language=fr&uselang=fr&utm_medium=sitenotice&utm_campaign=test&utm_source=frFR_dsk_p1_lg_control_17_09_14'>Questions fréquentes</a>",
            countries: [
                "FR"
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
        announce: mUtil.isFrenchWikipedia(req.params.domain) ? getFrwikiAnnouncements() : []
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
