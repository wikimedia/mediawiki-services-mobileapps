'use strict';

const preq = require('preq');
const domino = require('domino');
const assert = require('../../utils/assert');
const server = require('../../utils/server');

describe('media', function () {

	this.timeout(20000);

	let svc;
	before(async () => {
		svc = await server.start();
	});
	after(async () => await svc.stop());

	it('Media-list resources should be the same on mobile-html', () => {
		let mediaListItems;
		return preq.get({
			uri: `${ server.config.uri }en.wikipedia.org/v1/page/media-list/Badminton_at_the_1992_Summer_Olympics`
		}).then((res) => {
			mediaListItems = res && res.body && res.body.items || [];
			preq.get({
				uri: `${ server.config.uri }en.wikipedia.org/v1/page/mobile-html/Badminton_at_the_1992_Summer_Olympics`
			}).then((mobileHtmlRes) => {
				const expectedTitle = 'File:Olympic_rings.svg';
				const body = domino.createDocument(mobileHtmlRes.body);
				const mediaListImg = mediaListItems.filter(item => item.title === expectedTitle);
				assert.ok(mediaListImg.length > 0);
				const expectedURL = '//upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Olympic_rings_without_rims.svg/320px-Olympic_rings_without_rims.svg.png';
				assert.ok(mediaListImg[0].srcset[0].src === expectedURL);
				const mobileHtmlImg = body.querySelectorAll(`a[href="./File:${ expectedTitle }"]`);
				assert.ok(mobileHtmlImg.length > 0);
			});
		});
	});
});
