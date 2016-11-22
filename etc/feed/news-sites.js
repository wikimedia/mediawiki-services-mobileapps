'use strict';

/**
 * @private {!string} _title
 * @private {!string} _headlineSelector
 */
class NewsSite {
    /**
     * @param {!string} title
     * @param {!string} headlineSelector
     */
    constructor(title, headlineSelector) {
        this._title = title;
        this._headlineSelector = headlineSelector;
    }

    /**
     * @return {!string} News source wiki portal or template title to scrape
     *                   data from
     */
    get title() {
        return this._title;
    }

    /**
     * @return {!string} Query selector for news headline containers (not
     *                   specific categories like deaths, sports, etc)
     */
    get headlineSelector() {
        return this._headlineSelector;
    }
}

/**
 * @type {{Object.<string, NewsSite>}} A map of Wikipedia site languages codes
 *                                     to NewsSites
 */
module.exports = {
    da: new NewsSite('Skabelon:Forside_aktuelle_begivenheder', 'div > li'),
    de: new NewsSite('Wikipedia:Hauptseite/Aktuelles', 'li'),
    el: new NewsSite('Πύλη:Τρέχοντα_γεγονότα/Επικεφαλίδες', 'li'),
    en: new NewsSite('Template:In_the_news', 'ul[id^=mw] li'),
    es: new NewsSite('Portal:Actualidad',
        'table:nth-of-type(1) > tbody > tr > td > ul:nth-of-type(1) > li'),
    fi: new NewsSite('Malline:Uutisissa', 'body > ul > li'),
    fr: new NewsSite('Modèle:Accueil_actualité', 'div ul[id^=mw] > li'),
    he: new NewsSite('תבנית:חדשות_ואקטואליה', 'body > ul > li'),
    ko: new NewsSite('틀:새로_들어온_소식', 'body > ul > li'),
    no: new NewsSite('Mal:Aktuelt', 'ul > li'),
    pl: new NewsSite('Szablon:Aktualności', 'ul:last-of-type > li'),
    pt: new NewsSite('Portal:Eventos_atuais', 'div > ul > li'),
    ru: new NewsSite('Шаблон:Актуальные_события', 'body > ul > li'),
    sv: new NewsSite('Portal:Huvudsida/Aktuella händelser', 'body > ul > li'),
    vi: new NewsSite('Bản_mẫu:Tin_tức', 'ul > li')
};
