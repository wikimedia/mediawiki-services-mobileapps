'use strict';

var BBPromise = require('bluebird');
var domino = require('domino');
var api = require('../api-util');
var mUtil = require('../mobile-util');
var mwapi = require('../mwapi');
var parsoid = require('../parsoid-access');
var HTTPError = require('../util').HTTPError;

var newsTemplates = {
    en: {title: 'Template:In_the_news', selector: 'ul[id^=mw]'},

    da: {title: 'Skabelon:Forside_aktuelle_begivenheder', selector: 'div'},
    de: {title: 'Wikipedia:Hauptseite/Aktuelles', selector: 'ul'},
    el: {title: 'Πύλη:Τρέχοντα_γεγονότα/Επικεφαλίδες', selector: 'ul'},
    es: {title: 'Portal:Actualidad', selector: 'ul'},
    fi: {title: 'Malline:Uutisissa', selector: 'ul'},
    fr: {title: 'Modèle:Accueil_actualité', selector: 'ul[id^=mw]'},
    he: {title: 'תבנית:חדשות_ואקטואליה', selector: 'ul'},
    ko: {title: '틀:새로_들어온_소식', selector: 'ul'},
    no: {title: 'Mal:Aktuelt', selector: 'ul'},
    pl: {title: 'Szablon:Aktualności', selector: 'ul:last-of-type'},
    pt: {title: 'Portal:Eventos_atuais', selector: 'ul'},
    ru: {title: 'Шаблон:Актуальные_события', selector: 'ul'},
    sv: {title: 'Portal:Huvudsida/Aktuella händelser', selector: 'ul'},
    vi: {title: 'Bản_mẫu:Tin_tức', selector: 'ul'},
    zh: {title: 'Portal:新聞動態', selector: 'ul'}
};

function removeFragment(href) {
    if (href.indexOf('#') > -1) {
        return href.substring(0, href.indexOf('#'));
    }
    return href;
}

function pushTitleIfNew(linkTitles, story, href) {
    if (linkTitles.indexOf(href) === -1) {
        story.links.push({ title: href });
        linkTitles.push(href);
    }
}

function createLinksList(href, linkTitles, story) {
    pushTitleIfNew(linkTitles, story, removeFragment(href.slice(1)));
}

function promise(app, req) {
    var lang = req.params.domain.split('.')[0];
    var aggregated = !!req.query.aggregated;
    if (!newsTemplates[lang]) {
        if (aggregated) {
            return BBPromise.resolve({ payload: undefined, meta: undefined });
        }
        throw new HTTPError({
            status: 501,
            type: 'unsupported_language',
            title: 'Language not supported',
            detail: 'The language you have requested is not yet supported.'
        });
    }

    var result = {
        payload: [],
        meta: {}
    };
    req.params.title = newsTemplates[lang].title;
    return parsoid.getParsoidHtml(app, req)
    .then(function (response) {
        result.meta.etag = parsoid.getRevisionFromEtag(response.headers);

        var linkTitles = [];
        var doc = domino.createDocument(response.body);
        var newsList = doc.querySelector(newsTemplates[lang].selector);
        var stories = newsList.getElementsByTagName('li');

        for (var j = 0, m = stories.length; j < m; j++) {
            var anchors = stories[j].querySelectorAll('a[rel="mw:WikiLink"]');
            var story = {
                links: []
            };

            for (var i = 0, n = anchors.length; i < n; i++) {
                createLinksList(anchors[i].href, linkTitles, story);
            }

            story.story = stories[j].innerHTML;
            result.payload.push(story);
        }
        return result;
    });
}

module.exports = {
    promise: promise,

    // visible for testing
    removeFragment: removeFragment,
    pushTitleIfNew: pushTitleIfNew,
    createLinksList: createLinksList
};
