const allTranslations = require('./parser-translations');
const removal = require('./parser-removal');
const TalkTopic = require('./TalkTopic').TalkTopic;

const sectionWithoutSubsections = section => {
  Array.from(section.querySelectorAll('section')).forEach(subSection => {
    subSection.parentNode.removeChild(subSection);
  });
  return section;
};

const flattenedSectionsInDoc = doc => Array.from(doc.querySelectorAll('section'))
  .map(sectionWithoutSubsections);

const parseUserTalkPageDocIntoTopicsWithReplies = (doc, lang) => {
  const translations = allTranslations.translationsForLang(lang);

  removal.replaceElementsContainingOnlyOneBreakWithBreak(doc);

  const allTopics = flattenedSectionsInDoc(doc)
    .map(sectionElement => new TalkTopic(sectionElement, doc, translations));

  allTopics.forEach((topic, i) => {
    topic.id = i;
    // ^ after T222419 is fixed can set `id` with the value from the section
    // element's `data-mw-section-id` (in `TalkTopic` constructor).

    // Since one of the sha's uses the `id` above
    // we can't calculate them until after the fix above is applied.
    // Once T222419 is fixed and the `data-mw-section-id` fix mentioned above is applied
    // we can then move the `addShas()` call to the end of the `TalkTopic` constructor.
    topic.addShas();
  });

  const topics = allTopics.filter(topic => !topic.isEmpty());
  return { topics };
};

module.exports = {
  parseUserTalkPageDocIntoTopicsWithReplies
};
