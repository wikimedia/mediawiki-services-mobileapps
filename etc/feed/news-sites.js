/**
 * A hash map of (Wikipedia site) languages codes to objects with
 * information to control how to get news items for this particular
 * Wikipedia site.
 * The object consists of a title and a selector.
 * 1) The title is the page title used to scrape the news items from.
 * 2) The selector is used to find a parent HTML element for <li> elements.
 *    In most cases simply the first 'ul' suffices but there are exceptions,
 *    often because the first <ul> contains template instructions instead
 *    of the actual news items, or instead of a <ul> Parsoid uses a <div>.
 */
const NEWS_TEMPLATES = {
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

module.exports = NEWS_TEMPLATES;
