#!/usr/bin/env node

'use strict';

/*
  Notes:
  * Start one local MCS instance for the "new" version before running this script.
  * Optionally, start another local MCS instance for the "old" version before
  * running this script. See comments near OLD_PORT below.
  * Run the script from the script folder.

  Arguments: provide a single argument which is the language code for
  the Wikipedia project or provide no argument for the default page list.
  The default list is a curated list of pages across wikis which are some
  good test pages for summary extracts.

  Example:
  $ npm start
  In another terminal run:
  $ ./scripts/compare-extracts.js en

  The output will be in the private/extracts folder.
*/

const BBPromise = require('bluebird');
const fs = require('fs');
const mkdir = require('mkdirp');
const preq = require('preq');
const path = require('path');

const DELAY = 10; // delay between requests in ms
const NEW_PORT = 8888;
const NEW_VERSION_INFO = '';
// Set OLD_PORT to a valid port number to go against a second local MCS instance.
// Set OLD_PORT to 0 to go against production.
const OLD_PORT = 0;
const OLD_VERSION_INFO = '';
const PROJECT = 'wikipedia';
const topPagesDir = path.join(__dirname, `../private/page-lists/top-pages/${PROJECT}`);
const pagesListsDir = path.join(__dirname, '../private/page-lists');
const outDir = path.join(__dirname, '../private/extracts');
const UNKNOWN_LANGUAGE = 'various';
const ENDPOINT = 'page/summary';

const html = { name: 'html' };
const plain = { name: 'plain' };
const other = { name: 'other' };

function getLanguageLinks() {
    return [
        'ar',
        'bg',
        'bn',
        'ca',
        'cs',
        'da',
        'de',
        'el',
        'en',
        'es',
        'fa',
        'fi',
        'fr',
        'he',
        'hi',
        'hr',
        'hu',
        'id',
        'it',
        'ja',
        'ko',
        'ms',
        'nl',
        'no',
        'pl',
        'pt',
        'ro',
        'ru',
        'sk',
        'sl',
        'sr',
        'sv',
        'th',
        'tr',
        'uk',
        'vi',
        'zh'
    ].map(lang => `<a href="./${lang}.html">${lang}</a>`).join(' ');
}

const uriForWikiLink = (domain, title, rev) => {
    return `https://${domain}/wiki/${title}?oldid=${rev}`;
};

const uriForParsoidLink = (domain, title, rev) => {
    return `https://${domain}/api/rest_v1/page/html/${title}/${rev}`;
};

const uriForProd = (domain, title) => {
    return `https://${domain}/api/rest_v1/${ENDPOINT}/${encodeURIComponent(title)}`;
};

const uriForLocal = (domain, title, rev, port = NEW_PORT) => {
    const suffix = rev ? `/${rev}` : '';
    return `http://localhost:${port}/${domain}/v1/${ENDPOINT}/${encodeURIComponent(title)}${suffix}`;
};

const outputStart = (type, lang) => {
    const file = type.overviewFile;
    file.write('<html>\n');
    file.write('<head>\n');
    file.write('<meta charset="UTF-8"/>\n');
    file.write('<link rel="StyleSheet" href="../static/compare-table.css" />\n');
    file.write('</head>\n');
    file.write('<body>\n');
    file.write('<script type="text/javascript" src="../static/compare-table.js" charset="utf-8"></script>\n');
    file.write(`<h2>Extract comparison for top pages in ${lang}.${PROJECT}.org</h2>\n`);
    file.write('<nav>\n');
    if (lang !== UNKNOWN_LANGUAGE) {
        file.write(`${getLanguageLinks()}\n<br/>\n`);
    }
    file.write(`<a href="../html/${lang}.html">html</a> |\n`);
    file.write(`<a href="../plain/${lang}.html">plain</a> |\n`);
    file.write(`<a href="../other/${lang}.html">other</a> |\n`);
    file.write('<form>\n');
    file.write('<input type="checkbox" id="showSameCB" onchange="toggleShow();">\n');
    file.write('<label for="showSameCB">Show same</label>\n');
    file.write('</form>\n');
    file.write('</nav>\n');
    file.write(`<p>old version on port ${OLD_PORT}: ${OLD_VERSION_INFO}<br/>\n`);
    file.write(`new version on port ${NEW_PORT}: ${NEW_VERSION_INFO}</p>\n`);
    file.write('<table>\n');
    file.write('<tr>\n');
    file.write('<th class="titleColumn">Title</th>\n');
    file.write(`<th class="valueColumn">Old (:${OLD_PORT})</th>\n`);
    file.write(`<th class="valueColumn">New (:${NEW_PORT})</th>\n`);
    file.write('</tr>\n');
    /* eslint-enable max-len */
};

const outputEnd = (type) => {
    const file = type.overviewFile;
    file.write('</table>\n');
    file.write('</body>\n');
    file.write('</html>\n');
    file.end();
};

const outputEndTxtFiles = () => {
    html.oldFile.end();
    html.newFile.end();
    plain.oldFile.end();
    plain.newFile.end();
    other.oldFile.end();
    other.newFile.end();
};

const compareExtractsHTML = (file, oldExtractValue, newExtractValue,
    counter, domain, title, rev) => {

    const displayTitle = title.replace(/_/g, ' ');
    const same = (oldExtractValue === newExtractValue) ? ' class="same"' : '';
    const positionLink = `<a id="${counter}" href="#${counter}">${counter}</a>`;
    file.write(`<tr${same}><td class="titleColumn">${positionLink}\n`);
    file.write(`<a href="${uriForWikiLink(domain, title, rev)}">${displayTitle}</a>\n`);
    file.write(`[<a href="${uriForParsoidLink(domain, title, rev)}">parsoid</a>]\n`);
    file.write(`<br/>[${ENDPOINT}:\n`);
    file.write(`<a href="${uriForProd(domain, title)}">prod</a>\n`);
    file.write(`<a href="${uriForLocal(domain, title, rev)}">local</a>]\n`);
    file.write('</td>\n');
    file.write(`<td class="valueColumn" dir="auto">${oldExtractValue}</td>\n`);
    file.write(`<td class="valueColumn" dir="auto">${newExtractValue}</td>\n`);
    file.write('</tr>\n');
};

/**
 * Make the src and srcset values https URLs instead of protocol-relative URLs.
 * Only needed if the HTML files are viewed locally (=base URL protocol is file) and you care
 * about seeing the images.
 */
const fixImgSources = (value) => {
    return value && value
        .replace(/<img src="\/\//g, '<img src="https://')
        .replace(/srcset="\/\//g, 'srcset="https://')
        .replace(/ 2x, \/\//g, ' 2x, https://');
};

const getExtract = (response) => {
    if (response.status !== 200) {
        return `!! STATUS = ${response.status} !!\n`;
    }
    fixImgSources(response.body.extract_html);
    return response.body;
};

const writeFile = (file, title, rev, value) => {
    file.write(`== ${title}/${rev}\n`);
    file.write(`${value}\n`);
};

const OTHER_PROPS = [ 'title', 'displaytitle', 'pageid', 'thumbnail', 'originalimage',
    'lang', 'dir', 'timestamp', 'coordinates' ];

const buildOtherPropString = (input) => {
    const result = {};
    OTHER_PROPS.forEach((key) => {
        result[key] = input[key];
    });
    return JSON.stringify(result, null, 2);
};

const compareExtractsSingleType = (type, oldExtractString, newExtractString,
    counter, domain, title, rev) => {

    compareExtractsHTML(type.overviewFile, oldExtractString, newExtractString, counter,
        domain, title, rev);
    writeFile(type.oldFile, title, rev, oldExtractString);
    writeFile(type.newFile, title, rev, newExtractString);
};

const compareExtracts = (oldExtract, newExtract, counter, domain, title, rev) => {
    compareExtractsSingleType(html, oldExtract.extract_html, newExtract.extract_html, counter,
        domain, title, rev);
    compareExtractsSingleType(plain, oldExtract.extract, newExtract.extract, counter,
        domain, title, rev);
    compareExtractsSingleType(other, buildOtherPropString(oldExtract),
        buildOtherPropString(newExtract), counter, domain, title, rev);
};

const fetchExtract = (uri) => {
    return preq.get({ uri })
    .then((response) => {
        return BBPromise.delay(DELAY, getExtract(response));
    }).catch((err) => {
        return BBPromise.resolve(`!!! ${err} "${uri}" !!!`);
    });
};

const fetchAndVerify = (page, counter) => {
    const domain = page.domain;
    const title = page.title;
    const rev = page.rev;
    process.stdout.write('.');
    let newExtract;
    return fetchExtract(uriForLocal(domain, title, rev))
    .then((response) => {
        newExtract = response;
        if (OLD_PORT) {
            return fetchExtract(uriForLocal(domain, title, rev, OLD_PORT));
        } else {
            return fetchExtract(uriForProd(domain, title));
        }
    }).then((oldExtract) => {
        compareExtracts(oldExtract, newExtract, counter, domain, title, rev);
    });
};

const iteratePages = (pageList, defaultDomain, pageFunction) => {
    let counter = 0;
    return BBPromise.each(pageList, (page) => {
        if (!page.domain) {
            page.domain = defaultDomain;
        }
        return pageFunction(page, ++counter);
    });
};

const processOneList = (defaultDomain, pageList) => {
    iteratePages(pageList, defaultDomain, (page, counter) => {
        return fetchAndVerify(page, counter);
    })
    .then(() => {
        outputEnd(html);
        outputEnd(plain);
        outputEnd(other);
        outputEndTxtFiles();
    });
};

const setupFiles = (type, lang) => {
    type.dir = `${outDir}/${type.name}`;
    mkdir.sync(type.dir);
    type.oldFileName = `${type.dir}/${lang}.v1.txt`;
    type.newFileName = `${type.dir}/${lang}.v2.txt`;
    type.overviewFileName = `${type.dir}/${lang}.html`;

    type.oldFile = fs.createWriteStream(type.oldFileName, { flags: 'w' });
    type.newFile = fs.createWriteStream(type.newFileName, { flags: 'w' });
    type.overviewFile = fs.createWriteStream(type.overviewFileName, { flags: 'w' });

    outputStart(type, lang);
};

// MAIN
const arg = process.argv[2];
if (process.argv.length > 3) {
    process.stderr.write('Error: supply only 0 or 1 language parameter (e.g. en)!\n');
    process.exit(-1);
}

let lang;
let pageList;

if (arg) {
    lang = arg;
    pageList = require(`${topPagesDir}/top-pages.${lang}.json`).items;
} else {
    lang = UNKNOWN_LANGUAGE;
    pageList = require(`${pagesListsDir}/summary-test-pages.json`).items;
}
setupFiles(html, lang);
setupFiles(plain, lang);
setupFiles(other, lang);
processOneList(`${lang}.${PROJECT}.org`, pageList);
