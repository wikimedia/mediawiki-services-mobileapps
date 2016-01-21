#!/usr/bin/env python
# coding=utf-8

from urllib2 import urlopen
import unicodecsv as csv
from itertools import islice
import json

# Returns CSV of all current wiktionaries
URL = "https://wikistats.wmflabs.org/api.php?action=dump&table=wiktionaries&format=csv"

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
