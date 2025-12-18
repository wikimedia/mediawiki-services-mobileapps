'use strict';

const assert = require('../../utils/assert');
const MobileHTML = require('../../../lib/mobile/MobileHTML');
const mRequestUtil = require('../../../lib/mobile/mobile-request-util');
const testUtil = require('../../utils/testUtil');

describe('lib:mobile/mobile-request-util', () => {
	it('getOutputMode should return defaults when provided nonsense string', () => {
		assert.deepEqual(mRequestUtil.getOutputMode('invalid string'),
			mRequestUtil.defaultOutputModeForPOSTResponse);
	});

	it('getOutputMode should return defaults when provided undefined', () => {
		assert.deepEqual(mRequestUtil.getOutputMode(undefined),
			mRequestUtil.defaultOutputModeForPOSTResponse);
	});

	it('getOutputMode should return defaults when provided null', () => {
		assert.deepEqual(mRequestUtil.getOutputMode(null),
			mRequestUtil.defaultOutputModeForPOSTResponse);
	});

	it('getOutputMode should return the requested item when it is the first member of the array', () => {
		assert.deepEqual(mRequestUtil.getOutputMode('contentAndReferences'),
			MobileHTML.OutputMode.contentAndReferences);
	});

	it('getOutputMode should return the requested item when it is a non-first member of the array', () => {
		assert.deepEqual(mRequestUtil.getOutputMode('editPreview'),
			MobileHTML.OutputMode.editPreview);
	});

	it('isWikipediaApp should return true for Wikipedia apps', () => {
		const mockReq = testUtil.getMockedServiceReq({
			params: { title: 'Cat', domain: 'en.wikipedia.org' },
			headers: {
				'user-agents': 'WikipediaApp/Foobar'
			},
		});
		mockReq.get.withArgs('user-agent').returns(mockReq.headers['user-agents']);
		assert.deepEqual(mRequestUtil.isWikipediaApp(mockReq), true);
	});

	it('isWikipediaApp should return false for non Wikipedia apps', () => {
		const mockReq = testUtil.getMockedServiceReq({
			params: { title: 'Cat', domain: 'en.wikipedia.org' },
			headers: {
				'user-agents': 'Foo/Bar'
			},
		});
		mockReq.get.withArgs('user-agent').returns(mockReq.headers['user-agents']);
		assert.deepEqual(mRequestUtil.isWikipediaApp(mockReq), false);
	});

	it('isWikipediaApp should return false for missing ua', () => {
		const mockReq = testUtil.getMockedServiceReq({
			params: { title: 'Cat', domain: 'en.wikipedia.org' }
		});
		mockReq.get.withArgs('user-agent').returns(undefined);
		assert.deepEqual(mRequestUtil.isWikipediaApp(mockReq), false);
	});

});
