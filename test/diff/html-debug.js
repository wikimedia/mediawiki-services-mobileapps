'use strict';

const beautifyHtml = require('js-beautify').html;
const fs = require('fs');
const mkdir = require('mkdirp');

const writeFilePrettifiedHtml = (html, baseFilePath, filePart2) => {
	if (/^\s+$/.test(html)) {
		return;
	}

	const prettyHtml = beautifyHtml(html,
		{ indent_size: 2, html: { end_with_newline: true } });
	fs.writeFileSync(`${ baseFilePath }${ filePart2 }.html`, prettyHtml, 'utf8');
};

const leadPostProcessing = (lead, baseFilePath) => {
	if (lead.text) {
		writeFilePrettifiedHtml(lead.text, baseFilePath, 'lead-text');
	}
	if (lead.intro) {
		writeFilePrettifiedHtml(lead.intro, baseFilePath, 'lead-intro');
	}
	if (lead.sections) {
		writeFilePrettifiedHtml(lead.sections[0].text, baseFilePath, 'lead-section0-text');
	}
};

const remainingPostProcessing = (remaining, baseFilePath) => {
	for (const section of remaining.sections) {
		if (section.text) {
			writeFilePrettifiedHtml(section.text, baseFilePath, `section${ section.id }-text`);
		}
	}
};

const htmlPostProcessing = (input, baseFilePath) => {
	mkdir.sync(baseFilePath);
	leadPostProcessing(input.lead, baseFilePath);
	remainingPostProcessing(input.remaining, baseFilePath);
};

module.exports = {
	htmlPostProcessing
};
