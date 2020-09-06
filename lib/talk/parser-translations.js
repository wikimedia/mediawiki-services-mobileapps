'use strict';

const translationsJSON = require('./parser-translations.json');

const translationsForLang = lang => {
  if (lang === 'test') {
    lang = 'en';
  }
  const langMatch =
    translationsJSON.languages.find(thisLang => thisLang.code === lang);
  if (langMatch) {
    const stringForNamespace = namespace => langMatch.translations
      .find(t => t.namespace === namespace).name
      .replace(/ /g, '_');
    return {
      user: stringForNamespace(2),
      userTalk: stringForNamespace(3)
    };
  }
  return undefined;
};

module.exports = {
  translationsForLang
};
