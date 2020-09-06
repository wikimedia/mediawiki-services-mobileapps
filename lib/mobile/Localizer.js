'use strict';

const Banana = require('banana-i18n');
const fs = require('fs');
const P = require('bluebird');
const wikiLanguage = require('../../lib/wikiLanguage');

const messagesByLocale = {};
const localizersByLocale = {};
const localeRegex = /^[a-z-]{2,7}$/i;

/**
 * i18n for PCS
 */
class Localizer {
    /**
     * Returns all of the localization strings relevant for the given locales
     *
     * @param {!Array<string>} locales list of locales
     * @return {!Promise} a promise resolving to a map from locale to a map with
     * messages for that locale by key
     */
    static getMessagesAndFallbacksForLocales(locales) {
        const props = {};
        const allLocales = new Set(locales);
        for (const locale of locales) {
            const fallbackBanana = new Banana(locale);
            const fallbackLocales = fallbackBanana.getFallbackLocales();
            for (const fallbackLocale of fallbackLocales) {
                allLocales.add(fallbackLocale);
            }
        }
        for (const locale of allLocales) {
            props[locale] = this.getMessagesForLocale(locale);
        }
        return P.props(props).then(props => {
            const filteredProps = {};
            for (const locale of Object.keys(props)) {
                const value = props[locale];
                if (!value || Object.keys(value).length === 0) {
                    continue;
                }
                filteredProps[locale] = value;
            }
            return filteredProps;
        });
    }

    /**
     * Return the localization strings for a given locale
     *
     * @param {!string} locale
     * @return {!Promise} a promise resolving to a map from
     * localization key to value for that locale. This method
     * returns an empty object instead of erroring out to allow
     * for multiple locales to be requested simultaneously without
     * one failure causing the whole request to fail.
     */
    static getMessagesForLocale(locale) {
        return new P((res) => {
            if (!locale) {
                res({});
                return;
            }
            // Check the cache first, returned cached messages if found
            if (messagesByLocale[locale]) {
                res(messagesByLocale[locale]);
                return;
            }
            // Ensure this is a language and not some other path
            if (!localeRegex.test(locale)) {
                // don't cache the empty object so we're not polluting the
                // cache with every bad key we get
                res({});
                return;
            }
            const stringsFolder = `${__dirname}/../../i18n/`;
            const stringsPath = `${stringsFolder + locale}.json`;
            fs.readFile(stringsPath, { encoding: 'utf8' }, (err, data) => {
                const bail = () => {
                    // cache the empty object so we don't keep trying to read
                    // from the filesystem for locales we don't have
                    messagesByLocale[locale] = {};
                    res({});
                };
                if (err || !data) {
                    bail();
                    return;
                }
                try {
                    const messages = JSON.parse(data);
                    messagesByLocale[locale] = messages;
                    res(messages);
                } catch (e) {
                    bail();
                }
            });
        });
    }

    /**
     * @param {!object} req request object
     * @return {!Array<string>} list of preferred locales for the request
     */
    static getLocalesFromReq(req) {
        const languageCode = wikiLanguage.getLanguageCode(req.params.domain);
        return wikiLanguage.getAllLanguageVariantsForLanguageCode(languageCode);
    }

    /**
     * @param {!object} req request object
     * @return {!Promise} promise that resolves to a localizer for that request
     */
    static promise(req) {
        return new P((res, rej) => {
            const languageCode = wikiLanguage.getLanguageCode(req.params.domain);
            let locales = [languageCode];
            if (wikiLanguage.isLanguageCodeWithVariants(languageCode)) {
                const acceptLanguage = req.headers['accept-language'];
                const relevantLocales = wikiLanguage
                    .relevantWikiLanguageCodesFromAcceptLanguageHeader(
                        acceptLanguage,
                        languageCode
                    );
                if (relevantLocales && relevantLocales.length > 0) {
                    locales = relevantLocales;
                }
            }
            const key = locales.join('|');
            if (localizersByLocale[key]) {
                res(localizersByLocale[key]);
                return;
            }
            Localizer.getMessagesAndFallbacksForLocales(locales).then(messages => {
                const banana = new Banana(locales[0], { finalFallback: 'en' });
                banana.load(messages);
                localizersByLocale[key] = banana;
                res(banana);
            }).catch(err => {
                rej(err);
            });
        });
    }
}

module.exports = Localizer;
