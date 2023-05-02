'use strict';

/**
 * @module scripts/generate-flaggedrevs-wikis
 */

const _ = require('underscore');
const fs = require('fs');
const preq = require('preq');
const BBPromise = require('bluebird');

const flaggedWikisUrl = 'https://noc.wikimedia.org/conf/dblists/flaggedrevs.dblist';
const wikiSitesListUrl = 'https://en.wikipedia.org/w/api.php?action=sitematrix&format=json';

const writeFile = (data) => {
	const file = fs.createWriteStream(`${__dirname}/../lib/flaggedWikisList.json`,
		{ flags: 'w' });
	file.write(JSON.stringify(data, null, 4));
	file.end();
};

const fetchUrl = (url) => {
	return preq.get({ url })
		.then((response) => {
			return response;
		}).catch((err) => {
			return BBPromise.resolve(`!!! ${err} "${url}" !!!`);
		});
};

const convertDbData = (dbnamesData, wikislistData) => {
	// Remove non-dbname elems (comment line and empty line) from the array
	const flaggedRevsDbList = dbnamesData.body.toString()
			.split('\n')
			.filter(s => !/^\s*#|^\s*$/.test(s)),

		wikislistDataSitematrix = wikislistData.body.sitematrix,

		flattenSites = _.flatten(
			_.map(Object.entries(wikislistDataSitematrix)
				.filter(([key, val]) => !isNaN(parseInt(key))), ([key, val]) => val.site)),

		sites = [
			...flattenSites,
			...wikislistDataSitematrix.specials
		];

	return flaggedRevsDbList.map(flaggedWiki => sites.find(siteProp => flaggedWiki === siteProp.dbname).url.replace('https://', ''));
};

const fetchExtract = (dbnamesUrl, listUrl) => {
	return BBPromise.join(
		fetchUrl(dbnamesUrl),
		fetchUrl(listUrl),
		(dbnames, wikislist) => {
			writeFile(convertDbData(dbnames, wikislist));
		}
	);
};

fetchExtract(flaggedWikisUrl, wikiSitesListUrl);
