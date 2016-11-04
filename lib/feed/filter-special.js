/**
 * Helper functions for handling blacklisted titles.
 */

'use strict';

var escape = require('escape-string-regexp');

function filterSpecialPages(articles, mainPageTitle) {
    var mainPageRegExp = new RegExp('^' + escape(mainPageTitle) + '$', 'i');
    return articles.filter(function(article) {
        return article.pageid
               && article.ns === 0
               && !mainPageRegExp.test(article.title);
    });
}

module.exports = filterSpecialPages;