#!/usr/bin/env python
# coding=utf-8

from urllib2 import urlopen
import unicodecsv as csv
from itertools import islice
import json

# Returns CSV of all current Wikipedia language names (in English) along with their
# wiki language codes.  We'll use the Wikipedias table for wider coverage since Wiktionaries
# can include content for other languages that don't have a Wiktionary of their own.
URL = "https://wikistats.wmflabs.org/api.php?action=dump&table=wikipedias&format=csv"

data = csv.reader(urlopen(URL))

langs_dict = {}

for row in islice(data, 1, None):
    if row[2] == 'zh':
        langs_dict['Simplified Chinese'] = 'zh-hans'
        langs_dict['Traditional Chinese'] = 'zh-hant'
    else:
        key = row[1].replace("'", "\\'")
        langs_dict[key] = row[2].replace("'", "\\'")

open("languages_list.json", "w").write(json.dumps(langs_dict, indent=2))
