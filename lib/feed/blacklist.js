/**
 * Helper functions for handling blacklisted titles.
 */

'use strict';

var BLACKLIST = require('../../etc/feed/blacklist');

function filter(titles) {
    return titles.filter(function(title) {
        return BLACKLIST.indexOf(title.article) === -1;
    });
}

function filterSpecialPages(articles, mainPageTitle) {
    var mainPageRegExp = new RegExp('^' + mainPageTitle + '$', 'i');
    return articles.filter(function(article) {
        return article.pageid
               && article.ns === 0
               && !mainPageRegExp.test(article.title);
    });
}

module.exports = {
    filter: filter,
    filterSpecialPages: filterSpecialPages
};