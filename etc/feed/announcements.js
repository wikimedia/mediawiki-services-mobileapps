'use strict';

// Featured feed announcement definitions
//
// This file contains the definition objects for announcements to be shown
// in the app featured feeds.
//
// Documentation of the various config options:
// https://www.mediawiki.org/wiki/Specs/Announcements/0.2.0

const AnnouncementType = {
    SURVEY: 'survey',
    FUNDRAISING: 'fundraising',
    ANNOUNCEMENT: 'announcement'
};

const Platform = {
    IOS: 'iOSApp',
    ANDROID_V1: 'AndroidApp',
    ANDROID_V2: 'AndroidAppV2'
};

const type = AnnouncementType.ANNOUNCEMENT;
const activeWikis = [
    'en.wikipedia.org',
    'de.wikipedia.org',
    'ru.wikipedia.org',
    'zh.wikipedia.org'
];
const startTime = '2018-08-09T20:00:00Z';
const endTime   = '2018-08-16T20:00:00Z';
const iosMinVersion = '5.8.0';
const iosMaxVersion = '5.8.1';
const idPrefix = 'MULTILANG0818';

const androidText = (headline, body) => `<b>${headline}</b><br><br>${body}`;

const iosBodyText = (headline, body) => `${headline}\n\n${body}`;

/**
 * @param {!string} os operating system, all caps ('IOS' or 'ANDROID')
 * @param {?string} id another string to distinguish different announcements, all caps
 */
const buildId = (os, id) => `${idPrefix}${os}${id}`;

const baseAnnouncement = {
    type,
    start_time: startTime,
    end_time: endTime,
    // beta: true,
    // logged_in: true,
    // reading_list_sync_enabled: true,
};

/* eslint-disable max-len */

const variantsLatestAppVersion = [
    {
        name: 'EN',
        domain: 'en.wikipedia.org',
        countries: [ 'US', 'UK', 'IE', 'CA', 'SA', 'AU', 'NZ', 'IN' ],
        text1: 'Wikipedia in all the languages you read',
        text2: `You can now use multiple languages in this latest version of the app! Easily switch between languages during search, and see content in the Explore feed from all your selected languages.`,
        negative_text: 'Got it ',
        action: {
            title: 'Edit languages',
        }
    },
    {
        name: 'DE',
        domain: 'de.wikipedia.org',
        countries: [ 'DE', 'AT', 'CH' ],
        text1: 'Wikipedia in allen Sprachen, die Sie lesen',
        text2: `Sie können nun mehrere Sprachen in dieser neuesten Version der App verwenden! Einfach zwischen den Sprachen während der Suche umschalten. Sie können auch Inhalte im Entdecken-Feed in mehreren Sprachen sehen.`,
        negative_text: 'Verstanden',
        action: {
            title: 'Sprachen bearbeiten',
        }
    },
    {
        name: 'RU',
        domain: 'ru.wikipedia.org',
        countries: [ 'RU' ],
        text1: 'Википедия на всех ваших языках',
        text2: `Теперь можно выбрать несколько языков в последней версии приложения! Выберите языки в настройках, или во время поиска, и читайте контент в Ленте на всех выбранных вами языках.`,
        negative_text: 'Понятно',
        action: {
            title: 'Выбрать языки',
        }
    },
    {
        name: 'HANT',
        domain: 'zh.wikipedia.org',
        countries: [ 'TW', 'HK', 'MO' ], // Traditional Chinese: Taiwan, HK, Macau
        text1: '維基百科支援您熟悉的語言',
        text2: `您現在可以在最新版中設置多個您熟悉的語言！您可以在搜尋條目或是瀏覽新聞動態時輕鬆切換您所選定的語言。`,
        negative_text: '知道了',
        action: {
            title: '設置語言',
        }
    },
    {
        name: 'HANS',
        domain: 'zh.wikipedia.org',
        countries: [ 'CN', 'SG' ], // Simplified Chinese: China, Singapore
        text1: '维基百科支援您熟悉的语言',
        text2: `您现在可以在最新版中设置多个您熟悉的语言！您可以在搜寻条目或是浏览新闻动态时轻松切换您所选定的语言。`,
        negative_text: '知道了',
        action: {
            title: '设置语言',
        }
    }
];

const variantsUpdateAppVersion = [
    {
        name: 'EN',
        domain: 'en.wikipedia.org',
        countries: [ 'US', 'UK', 'IE', 'CA', 'SA', 'AU', 'NZ', 'IN' ],
        text1: 'Multilingual reading in our latest app release',
        text2: `You can now use multiple languages in the latest version of the app. Update and switch between languages during search, and see content in the Explore feed from all your selected languages.`,
        negative_text: 'Got it ',
        action: {
            title: 'Update in Google Play',
        }
    },
    {
        name: 'DE',
        domain: 'de.wikipedia.org',
        countries: [ 'DE', 'AT', 'CH' ],
        text1: 'Lesen Wikipedia in mehrere Sprachen in der neuesten Version der App',
        text2: `Wechseln Sie einfach zwischen Sprachen während der Suche. Sie können auch Inhalte im Entdecken-Feed in mehreren Sprachen sehen. Aktualisieren Sie die App auf die neueste Version um diese Funktionen zu verwenden.`,
        negative_text: 'Verstanden',
        action: {
            title: 'Aktualisieren in Google Play',
        }
    },
    {
        name: 'RU',
        domain: 'ru.wikipedia.org',
        countries: [ 'RU' ],
        text1: 'Многоязычное чтение в нашей последней версии',
        text2: `Теперь можно выбрать несколько языков в последней версии приложения! Выберите языки в настройках, или во время поиска, и читайте контент в Ленте на всех выбранных вами языках.`,
        negative_text: 'Понятно',
        action: {
            title: 'Обновить в Google Play',
        }
    },
    {
        name: 'HANT',
        domain: 'zh.wikipedia.org',
        countries: [ 'TW', 'HK', 'MO' ], // Traditional Chinese: Taiwan, HK, Macau
        text1: '維基百科支援您熟悉的語言',
        text2: `您現在可以在最新版中設置多個您熟悉的語言！您可以在搜尋條目或是瀏覽新聞動態時輕鬆切換您所選定的語言。`,
        negative_text: '知道了',
        action: {
            title: '設置語言',
        }
    },
    {
        name: 'HANS',
        domain: 'zh.wikipedia.org',
        countries: [ 'CN', 'SG' ], // Simplified Chinese: China, Singapore
        text1: '维基百科支援您熟悉的语言',
        text2: `您现在可以在最新版中设置多个您熟悉的语言！您可以在搜寻条目或是浏览新闻动态时轻松切换您所选定的语言。`,
        negative_text: '知道了',
        action: {
            title: '设置语言',
        }
    }
];

/* eslint-enable max-len */

const androidAnnouncementLatestAppVersion = (variant) => {
    return Object.assign({}, baseAnnouncement, {
        id: buildId('ANDROIDLATEST', variant.name),
        platforms: [ Platform.ANDROID_V2 ],
        min_version: 235,
        countries: variant.countries,
        image: 'https://upload.wikimedia.org/wikipedia/commons/1/1f/Multilingual_announcement_graphic.png',
        image_height: 168, // in dp
        text: androidText(variant.text1, variant.text2),
        action: {
            title: variant.action.title,
            url: '#languages'
        },
        negative_text: variant.negative_text,
    });
};

const androidAnnouncementUpdateAppVersion = (variant) => {
    return Object.assign({}, baseAnnouncement, {
        id: buildId('ANDROIDUPDATEPROMPT', variant.name),
        platforms: [ Platform.ANDROID_V2 ],
        max_version: 234,
        countries: variant.countries,
        image: 'https://upload.wikimedia.org/wikipedia/commons/6/62/Yellow50-pixelbackground.png',
        image_height: 16, // in dp
        text: androidText(variant.text1, variant.text2),
        action: {
            title: variant.action.title,
            url: 'https://play.google.com/store/apps/developer?id=Wikimedia+Foundation'
        },
        negative_text: variant.negative_text,
    });
};

const iosAnnouncement = (variant) => {
    return Object.assign({}, baseAnnouncement, {
        id: buildId('IOS', variant.name),
        platforms: [ Platform.IOS ],
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Multilingual_announcement_graphic.png/640px-Multilingual_announcement_graphic.png',
        min_version: iosMinVersion,
        max_version: iosMaxVersion,
        text: iosBodyText
    });
};

module.exports = {
    activeWikis,
    variantsLatestAppVersion,
    variantsUpdateAppVersion,
    androidAnnouncementLatestAppVersion,
    androidAnnouncementUpdateAppVersion,
    iosAnnouncement,
    startTime,
    endTime,
    buildId,
    Platform
};
