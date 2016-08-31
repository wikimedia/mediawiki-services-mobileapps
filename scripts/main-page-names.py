#!/usr/bin/env python2
# coding=utf-8

# This script is copied in significant part from scripts/make-templates.py in
# the wikipedia-apps-android repo, mainly for the wiki main page data extraction
# and processing logic.  It's modified so as not to generate jinja templates,
# which we don't need here, and to output only the data we need, and do so in a
# format we can readily use.

import copy
import os
import json
import unicodecsv as csv
import codecs
from urllib2 import urlopen


CHINESE_WIKI_LANG = "zh"
SIMPLIFIED_CHINESE_LANG = "zh-hans"
TRADITIONAL_CHINESE_LANG = "zh-hant"

# T114042
NORWEGIAN_BOKMAL_WIKI_LANG = "no"
NORWEGIAN_BOKMAL_LANG = "nb"


# Wikis that cause problems and hence we pretend
# do not exist.
# - "got" -> Gothic runes wiki. The name of got in got
#   contains characters outside the Unicode BMP. Android
#   hard crashes on these. Let's ignore these fellas
#   for now.
OSTRICH_WIKIS = [u"got"]


# Represents a single wiki, along with arbitrary properties of that wiki
# Simple data container object
class Wiki(object):
    def __init__(self, lang):
        self.lang = lang
        self.props = {}


# Represents a list of wikis plus their properties.
class WikiList(object):
    def __init__(self, wikis):
        self.wikis = wikis


def build_wiki(lang, english_name, local_name, total_pages=0):
    wiki = Wiki(lang)
    wiki.props["english_name"] = english_name
    wiki.props["local_name"] = local_name
    wiki.props["total_pages"] = total_pages
    return wiki


def list_from_wikistats():
    URL = u"https://wikistats.wmflabs.org/api.php?action=dump&table=wikipedias&format=csv&s=good"

    print(u"Fetching languages")
    data = csv.reader(urlopen(URL))
    wikis = []

    is_first = True
    for row in data:
        if is_first:
            is_first = False
            continue  # skip headers
        wiki = build_wiki(lang=row[2], english_name=row[1], local_name=row[10],
                          total_pages=row[3])
        wikis.append(wiki)

    return wikis


# Remove unsupported wikis.
def filter_supported_wikis(wikis):
    return [wiki for wiki in wikis if wiki.lang not in OSTRICH_WIKIS]


# Apply manual tweaks to the list of wikis before they're populated.
def preprocess_wikis(wikis):
    # Add TestWiki.
    wikis.append(build_wiki(lang="test", english_name="Test", local_name="Test",
                 total_pages=0))

    return wikis


# Apply manual tweaks to the list of wikis after they're populated.
def postprocess_wikis(wiki_list):
    # Add Simplified and Traditional Chinese dialects.
    chineseWiki = next((wiki for wiki in wiki_list.wikis if wiki.lang == CHINESE_WIKI_LANG), None)
    chineseWikiIndex = wiki_list.wikis.index(chineseWiki)

    simplifiedWiki = copy.deepcopy(chineseWiki)
    simplifiedWiki.lang = SIMPLIFIED_CHINESE_LANG
    simplifiedWiki.props["english_name"] = "Simplified Chinese"
    simplifiedWiki.props["local_name"] = "简体"
    wiki_list.wikis.insert(chineseWikiIndex + 1, simplifiedWiki)

    traditionalWiki = copy.deepcopy(chineseWiki)
    traditionalWiki.lang = TRADITIONAL_CHINESE_LANG
    traditionalWiki.props["english_name"] = "Traditional Chinese"
    traditionalWiki.props["local_name"] = "繁體"
    wiki_list.wikis.insert(chineseWikiIndex + 2, traditionalWiki)

    bokmalWiki = next((wiki for wiki in wiki_list.wikis if wiki.lang == NORWEGIAN_BOKMAL_WIKI_LANG), None)
    bokmalWiki.lang = NORWEGIAN_BOKMAL_LANG

    return wiki_list


# Populates data on names of main page in each wiki
def populate_main_pages(wikis):
    for wiki in wikis.wikis:
        print(u"Fetching Main Page for %s" % wiki.lang)
        url = u"https://%s.wikipedia.org/w/api.php" % wiki.lang + \
              u"?action=query&meta=siteinfo&format=json&siprop=general"
        data = json.load(urlopen(url))
        wiki.props[u"main_page_name"] = data[u"query"][u"general"][u"mainpage"]
    return wikis


def render_list(key, filename):
    def _actual_render(wikis):
        mainpages = list(wiki.props[key] for wiki in wikis.wikis)
        writer = csv.writer(open(filename, 'wb'))
        writer.writerow(set(mainpages));
        return wikis
    return _actual_render


# Kinda like reduce(), but special cases first function
def chain(*funcs):
    res = funcs[0]()
    for func in funcs[1:]:
        res = func(res)


chain(
    list_from_wikistats,
    filter_supported_wikis,
    preprocess_wikis,
    WikiList,
    populate_main_pages,
    postprocess_wikis,
    render_list(u"main_page_name", u"static/mainpages.csv")
)
