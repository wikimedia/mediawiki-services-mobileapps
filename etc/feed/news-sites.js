'use strict';

/**
 * A hash map of (Wikipedia site) languages codes to objects with
 * information to control how to get news items for this particular
 * Wikipedia site.
 * The object consists of a title and a selector.
 * 1) The title is the page title used to scrape the news items from.
 * 2) The selector is used to query news headlines, usually found in the
 *    first 'ul' but there are exceptions, often because the first <ul>
 *    contains template instructions instead of the actual news items,
 *    or instead of a <ul> Parsoid uses a <div>. This selector should
 *    not include specific categories like deaths, sports, etc.
 */
module.exports = {
    da: { title: 'Skabelon:Forside_aktuelle_begivenheder', headlineSelector: 'div > li' },
    de: { title: 'Wikipedia:Hauptseite/Aktuelles', headlineSelector: 'li' },
    el: { title: 'Πύλη:Τρέχοντα_γεγονότα/Επικεφαλίδες', headlineSelector: 'li' },
    en: { title: 'Template:In_the_news', headlineSelector: 'ul[id^=mw] li' },
    es: { title: 'Portal:Actualidad',
        headlineSelector: 'table:nth-of-type(1) > tbody > tr > td > ul:nth-of-type(1) > li' },
    fi: { title: 'Malline:Uutisissa', headlineSelector: 'body > ul > li' },
    fr: { title: 'Modèle:Accueil_actualité', headlineSelector: 'div ul[id^=mw] > li' },
    he: { title: 'תבנית:חדשות_ואקטואליה', headlineSelector: 'body > ul > li' },
    ko: { title: '틀:새로_들어온_소식', headlineSelector: 'body > ul > li' },
    no: { title: 'Mal:Aktuelt', headlineSelector: 'ul > li' },
    pl: { title: 'Szablon:Aktualności', headlineSelector: 'ul:last-of-type > li' },
    pt: { title: 'Portal:Eventos_atuais', headlineSelector: 'div > ul > li' },
    ru: { title: 'Шаблон:Актуальные_события', headlineSelector: 'body > ul > li' },
    sv: { title: 'Portal:Huvudsida/Aktuella händelser', headlineSelector: 'body > ul > li' },
    vi: { title: 'Bản_mẫu:Tin_tức', headlineSelector: 'ul > li' }
};
