'use strict';

const assert = require('../../utils/assert.js');
const BBPromise = require('bluebird');
const preq   = require('preq');
const util = require('../../utils/testUtil');
const getFlaggedOrLatestRevision = require('../../../lib/mwapi').getFlaggedOrLatestRevision;

const logger = require('bunyan').createLogger({
	name: 'test-logger',
	level: 'warn'
});
logger.log = function(a, b) {};

describe('lib:mwapi:getFlaggedOrLatestRevision', () => {

	const tests = [
		{ args: ['with', 'EN_81346', 'de', 'wikipedia'], expected: true },
		{ args: ['without', 'Barack_Obama', 'pt', 'wikipedia'], expected: false },
		{ args: ['with', 'கலிலியோ_செயற்கைகோள்_செயல்பாட்டுக்கு_வந்தது', 'ta', 'wikinews'], expected: true },
		{ args: ['without', 'Mars', 'pl', 'wikinews'], expected: false },
		{ args: ['with', 'Aristoteles', 'de', 'wikiquote'], expected: true },
		{ args: ['without', 'Mars', 'pl', 'wikiquote'], expected: false },
		{ args: ['with', 'Miazga', 'pl', 'wikisource'], expected: true },
		{ args: ['without', 'Barack_Obama', 'en', 'wikisource'], expected: false },
		{ args: ['with', 'nafnorð', 'is', 'wiktionary'], expected: true },
		{ args: ['without', 'IBM', 'en', 'wiktionary'], expected: false },
		{ args: ['with', 'Chess', 'en', 'wikibooks'], expected: true },
		{ args: ['without', 'Reisen_in_das_Alte_Dresden', 'de', 'wikibooks'], expected: false }
	];

	tests.forEach(({ args, expected }) => {
		const domain = `${ args[2] }.${ args[3] }.org`;
		it(`Test ${ domain } ${ args[0] } flagged revision extension`, () => {
			const req = util.getMockedServiceReq({
				params: { title: args[1], domain },
			});
			req.logger = logger;
			return BBPromise.resolve(getFlaggedOrLatestRevision(req)).then(revision => {
				assert.equal(!!revision, expected);
			});
		});
	});

	it('Test non-flagged article from test2.wikipedia.org ', () => {
		const domain = 'test2.wikipedia.org';
		const title = 'FlaggedRevsTest';
		const uri = `https://${ domain }/api/rest_v1/page/title/${ title }`;
		const getLatestRevision = () => preq.get({ uri })
			.then((res) => res.body.items[0].rev, (err) => {
				throw new Error(`Error fetching latest revision for ${ title }: ${ err }`);
			});

		const req = util.getMockedServiceReq({
			params: { title, domain },
		});
		req.logger = logger;
		return BBPromise.join(
			getLatestRevision(),
			getFlaggedOrLatestRevision(req),
			(latestRevision, revision) => {
				assert.equal(latestRevision, revision);
			}
		);
	});

	it('Test pending change article from test2.wikipedia.org', () => {
		const domain = 'test2.wikipedia.org';
		const title = 'PendingChangeFlaggedRevsTest';
		const uri = `https://${ domain }/api/rest_v1/page/title/${ title }`;
		const getLatestRevision = () => preq.get({ uri })
			.then((res) => res.body.items[0].rev, (err) => {
				throw new Error(`Error fetching latest revision for ${ title }: ${ err }`);
			});
		const req = util.getMockedServiceReq({
			params: { title, domain },
		});
		req.logger = logger;
		return BBPromise.join(
			getLatestRevision(),
			getFlaggedOrLatestRevision(req),
			(latestRevision, revision) => {
				assert.ok(latestRevision > revision);
			}
		);
	});

});
