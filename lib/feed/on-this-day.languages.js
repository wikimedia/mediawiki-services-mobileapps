'use strict';

const dashChars = String.raw`\u002D\u2013\u2014\u2212`;

const languages = {

    en: {
        monthNames : [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October','November', 'December'
        ],
        dayPage : {
            // https://en.wikipedia.org/api/rest_v1/page/html/May_22
            nameFormatter : (monthName, monthNumber, dayNumber) => `${monthName}_${dayNumber}`,
            headingIds: {
                births: ['Births'],
                deaths: ['Deaths'],
                events: ['Events'],
                holidays: ['Holidays_and_observances']
            }
        },
        selectedPage : {
            // https://en.wikipedia.org/api/rest_v1/page/html/Wikipedia:Selected_anniversaries%2FMay_22
            nameFormatter : (monthName, monthNumber, dayNumber) =>
                `Wikipedia:Selected_anniversaries/${monthName}_${dayNumber}`,
            listElementSelector: 'body > ul li,section > ul li'
        },
        yearListElementRegEx :
          // eslint-disable-next-line max-len
          new RegExp(String.raw`^\s*(?:ad\s+)?(\d+)\s*(?:(bce?)|ad|ce)?\s*[${dashChars}]\s*(.*\S.*)`, 'i'),
        yearPrefixRegEx :
          new RegExp(String.raw`^\s*(\d+)\s*[:${dashChars}]*\s*$`, 'i')
    },

    de: {
        monthNames : [
            'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
            'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
        ],
        dayPage : {
            // https://de.wikipedia.org/api/rest_v1/page/html/22._Mai
            nameFormatter : (monthName, monthNumber, dayNumber) => `${dayNumber}._${monthName}`,
            headingIds: {
                births: ['Geboren'],
                deaths: ['Gestorben'],
                events: ['Ereignisse'],
                holidays: [
                    'Feier-_und_Gedenktage',
                    'Feier-,_Gedenk-_und_Aktionstage',
                    'Feier-,_Aktions-_und_Gedenktage'
                ]
            }
        },
        selectedPage: {
            // https://de.wikipedia.org/api/rest_v1/page/html/Wikipedia:Hauptseite%2FJahrestage%2FMai%2F22
            nameFormatter : (monthName, monthNumber, dayNumber) =>
                `Wikipedia:Hauptseite/Jahrestage/${monthName}/${dayNumber}`,
            listElementSelector: 'body > ul li,section > ul li'
        },
        yearListElementRegEx :
          new RegExp(String.raw`^\s*(\d+)\s*(v\.\s*Chr\.)?\s*(?::|[${dashChars}])\s*(.*\S.*)`, 'i'),
        yearPrefixRegEx :
          new RegExp(String.raw`^\s*(\d+)\s*[:${dashChars}]*\s*$`, 'i')
    },

    fr: {
        monthNames : [
            'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
            'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
        ],
        dayPage : {
            // https://fr.wikipedia.org/api/rest_v1/page/html/22_mai
            nameFormatter : (monthName, monthNumber, dayNumber) => {
                if (dayNumber === 1) {
                    dayNumber = '1er';
                }
                return `${dayNumber}_${monthName}`;
            },
            headingIds: {
                births: ['Naissances'],
                deaths: ['Décès'],
                events: ['Événements', 'Évènements'],
                holidays: ['Célébrations']
            }
        },
        selectedPage: {
            // https://fr.wikipedia.org/api/rest_v1/page/html/Wikipédia:Éphéméride%2F22_mai
            nameFormatter : (monthName, monthNumber, dayNumber) => {
                if (dayNumber === 1) {
                    if (new Set([1, 2, 3, 5, 9, 10, 11, 12]).has(monthNumber)) {
                        dayNumber = '1er';
                    }
                }
                return `Wikipédia:Éphéméride/${dayNumber}_${monthName}`;
            },
            listElementSelector: 'body > ul li,section > ul li'
        },
        yearListElementRegEx :
          // eslint-disable-next-line max-len
          new RegExp(String.raw`^\s*(\d+)\s*(av\.\s*J\.\s*[${dashChars}]C\.)?\s*(?::|[${dashChars}])\s*(.*\S.*)`, 'i'),
        yearPrefixRegEx :
          new RegExp(String.raw`^\s*(\d+)\s*[:${dashChars}]*\s*$`, 'i')
    },

    sv: {
        monthNames : [
            'januari', 'februari', 'mars', 'april', 'maj', 'juni',
            'juli', 'augusti', 'september', 'oktober', 'november', 'december'
        ],
        dayPage : {
            // https://sv.wikipedia.org/api/rest_v1/page/html/22_maj
            nameFormatter : (monthName, monthNumber, dayNumber) => `${dayNumber}_${monthName}`,
            headingIds: {
                births: ['Födda'],
                deaths: ['Avlidna'],
                events: ['Händelser'],
                holidays: ['Återkommande bemärkelsedagar']
            }
        },
        selectedPage : {
            // https://sv.wikipedia.org/api/rest_v1/page/html/Mall:22_maj
            nameFormatter : (monthName, monthNumber, dayNumber) => `Mall:${dayNumber}_${monthName}`,
            listElementSelector: 'body > ul li,section > ul li'
        },
        yearListElementRegEx :
          new RegExp(String.raw`^\s*(\d+)\s*(f\.\s*Kr\.)?\s*[${dashChars}]\s*(.*\S.*)`, 'i'),
        yearPrefixRegEx :
          new RegExp(String.raw`^\s*(\d+)\s*[:${dashChars}]*\s*$`, 'i')
    },

    pt: {
        monthNames : [
            'de janeiro', 'de fevereiro', 'de março', 'de abril', 'de maio', 'de junho',
            'de julho', 'de agosto', 'de setembro', 'de outubro', 'de novembro', 'de dezembro'
        ],
        dayPage : {
            // https://pt.wikipedia.org/api/rest_v1/page/html/15_de_maio
            nameFormatter : (monthName, monthNumber, dayNumber) => `${dayNumber}_${monthName}`,
            headingIds: {
                births: ['Nascimentos'],
                deaths: ['Mortes', 'Falecimentos'],
                events: ['Eventos', 'Eventos_históricos'],
                holidays: ['Feriados_e_eventos_cíclicos']
            }
        },
        selectedPage : {
            // https://pt.wikipedia.org/api/rest_v1/page/html/Wikipédia:Efemérides%2F22_de_maio
            nameFormatter : (monthName, monthNumber, dayNumber) =>
                `Wikipédia:Efemérides/${dayNumber}_${monthName}`,
            listElementSelector: 'body > ul li,section > ul li'
        },
        yearListElementRegEx :
          new RegExp(String.raw`^\s*(\d+)\s*(a\.\s*C\.)?\s*[${dashChars}]\s*(.*\S.*)`, 'i'),
        yearPrefixRegEx :
          new RegExp(String.raw`^\s*(\d+)\s*[:${dashChars}]*\s*$`, 'i')
    },

    ru: {
        monthNames : [
            'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
            'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
        ],
        dayPage : {
            // https://ru.wikipedia.org/api/rest_v1/page/html/22_мая
            nameFormatter : (monthName, monthNumber, dayNumber) => `${dayNumber}_${monthName}`,
            headingIds: {
                births: ['Родились'],
                deaths: ['Скончались'],
                events: ['События'],
                holidays: [
                    'Праздники',
                    'Праздники_и_памятные_дни',
                    'Праздники_и_памятные_даты',
                    'Праздники,_памятные_даты'
                ]
            }
        },
        selectedPage : {
            // https://ru.wikipedia.org/api/rest_v1/page/html/Шаблон:События_дня:05-30
            nameFormatter : (monthName, monthNo, dayNo) =>
                `Шаблон:События_дня:${monthNo < 10 ? `0${monthNo}` : monthNo}-${dayNo}`,
            listElementSelector: 'body > ul li,section > ul li'
        },
        yearListElementRegEx :
          // eslint-disable-next-line max-len
          new RegExp(String.raw`^\s*(\d+)\s*(?:год)?\s*(до\s*н\.\s*э\.)?\s*[${dashChars}]\s*(.*\S.*)`, 'i'),
        yearPrefixRegEx :
          new RegExp(String.raw`^\s*(\d+)\s*(?:год)?\s*[:${dashChars}]*\s*$`, 'i')
    },

    es: {
        monthNames : [
            'de enero', 'de febrero', 'de marzo', 'de abril', 'de mayo', 'de junio',
            'de julio', 'de agosto', 'de septiembre', 'de octubre', 'de noviembre', 'de diciembre'
        ],
        dayPage : {
            // https://es.wikipedia.org/api/rest_v1/page/html/22_de_mayo
            nameFormatter : (monthName, monthNumber, dayNumber) => `${dayNumber}_${monthName}`,
            headingIds: {
                births: ['Nacimientos'],
                deaths: ['Fallecimientos'],
                events: ['Acontecimientos'],
                holidays: ['Celebraciones']
            }
        },
        selectedPage : {
            // https://es.wikipedia.org/api/rest_v1/page/html/Plantilla:Efemérides_-_22_de_mayo
            nameFormatter : (monthName, monthNumber, dayNumber) =>
                `Plantilla:Efemérides - ${dayNumber}_${monthName}`,
            listElementSelector: 'body > ul li,section > ul li'
        },
        yearListElementRegEx :
          new RegExp(String.raw`^\s*(\d+)\s*(a\.\s*C\.)?\s*\.*[:${dashChars}]\s*(.*\S.*)`, 'i'),
        yearPrefixRegEx :
          new RegExp(String.raw`^\s*(\d+)\s*[:${dashChars}]*\s*$`, 'i')
    },

    ar: {
        monthNames : [
            'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
        ],
        dayPage : {
            // https://ar.wikipedia.org/api/rest_v1/page/html/22_مايو
            nameFormatter : (monthName, monthNumber, dayNumber) => `${dayNumber}_${monthName}`,
            headingIds: {
                births: ['مواليد'],
                deaths: ['وفيات'],
                events: ['أحداث'],
                holidays: ['أعياد_ومناسبات']
            }
        },
        selectedPage : {
            // https://ar.wikipedia.org/api/rest_v1/page/html/%D9%88%D9%8A%D9%83%D9%8A%D8%A8%D9%8A%D8%AF%D9%8A%D8%A7%3A%D9%81%D9%8A_%D9%87%D8%B0%D8%A7_%D8%A7%D9%84%D9%8A%D9%88%D9%85%2F22_%D9%85%D8%A7%D9%8A%D9%88
            nameFormatter : (monthName, monthNumber, dayNumber) =>
                `ويكيبيديا:في_هذا_اليوم/${dayNumber}_${monthName}`,
            listElementSelector: 'body > ul li,section > ul li'
        },
        yearListElementRegEx :
          new RegExp(String.raw`^\s*(\d+)\s*(ق.م)?\s*[${dashChars}]\s*(.*\S.*)`, 'i'),
        yearPrefixRegEx :
          new RegExp(String.raw`^\s*(\d+)\s*[:${dashChars}]*\s*$`, 'i')
    },

    bs: {
        monthNames : [
            'januar', 'februar', 'mart', 'april', 'maj', 'juni',
            'juli', 'august', 'septembar', 'oktobar', 'novembar', 'decembar'
        ],
        dayPage : {
            // https://bs.wikipedia.org/wiki/1._januar
            nameFormatter : (monthName, monthNumber, dayNumber) => `${dayNumber}_${monthName}`,
            headingIds: {
                births: ['Rođeni'],
                deaths: ['Umrli'],
                events: ['Događaji'],
                holidays: ['Praznici']
            }
        },
        selectedPage : {
            // https://bs.wikipedia.org/wiki/%C5%A0ablon:Na_dana%C5%A1nji_dan/1._januar
            nameFormatter : (monthName, monthNumber, dayNumber) =>
                `Šablon:Na_današnji_dan/${dayNumber}._${monthName}`,
            listElementSelector: 'body > ul li,section > ul li'
        },
        yearListElementRegEx :
            new RegExp(String.raw`^\s*(\d+)\s*(p\. n\. e)?\s*(?::|[${dashChars}])\s*(.*\S.*)`, 'i'),
        yearPrefixRegEx :
            new RegExp(String.raw`^\s*(\d+)\s*[:${dashChars}]*\s*$`, 'i')
    }

};

module.exports = {
    languages
};
