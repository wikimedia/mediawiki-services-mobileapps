'use strict';

const preq   = require('preq');
const assert = require('../../utils/assert.js');
const server = require('../../utils/server.js');

describe('transform/html/to/mobile-html', function() {

	this.timeout(20000);

	let svc;
	before(async () => {
		svc = await server.start();
	});
	after(async () => await svc.stop());

	const localUri = (title, domain = 'en.wikipedia.org') => {
		return `${ server.config.uri }${ domain }/v1/transform/html/to/mobile-html/${ title }`;
	};

	it('simple html convertion should work properly', () => {
		const uri = localUri('Presidency_of_George_Washington');
		return preq.post({ uri, body: {
			html: '<p id="mwAQ">%3D%3DStart%20of%20first%20presidential%20and%20vice-presidential%20terms%3D%3D%0A%5B%5BFile%3A%20Washington%27s%20Inauguration.jpg%7Cthumb%7Cupright%3D.95%7CWashington%27s%20first%20inauguration%2C%20April%2030%2C%201789%5D%5D%0A%0AThe%20%5B%5BCongress%20of%20the%20Confederation%5D%5D%20had%20set%20%20March%204%2C%201789%20as%20the%20date%20for%20the%20beginning%20of%20operations%20of%20the%20%5B%5BFederal%20government%20of%20the..%20United%20States%7Cfederal%20government%5D%5D%20under%20the%20new%20U.S.%20Constitution.%20Owing%20to%20the%20formidable%20difficulties%20of%20long-distance%20travel%20in%2018th%20century%20America%2C%20Congress%20was%20unable%20to%20reach%20a%20quorum%20until%20April.%3Cref%20name%3DAH68AI%3E%7B%7Bcite%20magazine%7C%20last%3DHenry%7C%20first%3DLaurin%20L.%7C%20date%3DOctober%201968%7C%20title%3DThe%20Awkward%20Interval%7C%20url%3Dhttp%3A%2F%2Fwww.americanheritage.com%2Fcontent%2Fawkward-interval%7C%20magazine%3D%5B%5BAmerican%20Heritage%20%28magazine%29%7CAmerican%20Heritage%5D%5D%7C%20publisher%3DAmerican%20Heritage%20Publishing%7C%20location%3DRockville%2C%20Maryland%7C%20volume%3D19%7C%20issue%3D6%7C%20access-date%3DJuly%2017%2C%202017%7C%20url-status%3Dlive%7C%20archive-url%3Dhttps%3A%2F%2Fweb.archive.org%2Fweb%2F20170728035908%2Fhttp%3A%2F%2Fwww.americanheritage.com%2Fcontent%2Fawkward-interval%7C%20archive-date%3DJuly%2028%2C%202017%7D%7D%3C%2Fref%3E%20The%20House%20would%20not%20achieve%20a%20quorum%20until%20April%201%2C%20and%20the%20Senate%20on%20April%206%2C%20at%20which%20time%20the%20electoral%20votes%20were%20counted.%3Cref%20name%3DNARA1GW%3E%7B%7Bcite%20web%20%7Ctitle%3DFirst%20Inaugural%20Address%20%7Curl%3Dhttps%3A%2F%2Fwww.archives.gov%2Flegislative%2Ffeatures%2Fgw-inauguration%20%7Cpublisher%3DNational%20Archives%20and%20Records%20Administration%20%7Clocation%3DWashington%2C%20D.C.%20%7Cdate%3DJuly%2017%2C%202017%20%7Caccess-date%3DJuly%2018%2C%202017%20%7Curl-status%3Dlive%20%7Carchive-url%3Dhttps%3A%2F%2Fweb.archive.org%2Fweb%2F20170719182739%2Fhttps%3A%2F%2Fwww.archives.gov%2Flegislative%2Ffeatures%2Fgw-inauguration%20%7Carchive-date%3DJuly%2019%2C%202017%20%7D%7D%3C%2Fref%3E%3Cref%3E%7B%7Bcite%20web%20%7Curl%3Dhttp%3A%2F%2Fmemory.loc.gov%2Fcgi-bin%2Fampage%3FcollId%3Dllsj%26fileName%3D001%2Fllsj001.db%26recNum%3D4%20%7Ctitle%3DSenate%20Journal%20%7Cpublisher%3D1st%20Congress%2C%201st%20session%20%7Cdate%3DApril%206%2C%201789%20%7Cpages%3D7%E2%80%938%20%7Curl-status%3Dlive%20%7Carchive-url%3Dhttps%3A%2F%2Fweb.archive.org%2Fweb%2F20100204011456%2Fhttp%3A%2F%2Fmemory.loc.gov%2Fcgi-bin%2Fampage%3FcollId%3Dllsj%26fileName%3D001%252Fllsj001.db%26recNum%3D4%20%7Carchive-date%3DFebruary%204%2C%202010%20%7D%7D%3C%2Fref%3E%3Cref%3E%7B%7BCite%20web%7Curl%3Dhttp%3A%2F%2Fhistory.house.gov%2FHistorical-Highlights%2F1700s%2FThe-first-Quorum-of-the-House-of-Representatives%2F%7Ctitle%3DThe%20First%20Quorum%20of%20the%20House%20of%20Representatives%20%7Cwebsite%3D%20US%20House%20of%20Representatives%3A%20History%2C%20Art%20%26%20Archives%7Clanguage%3Den%7Caccess-date%3DMarch%2019%2C%202018%7D%7D%3C%2Fref%3E%20Washington%20and%20Adams%20were%20certified%20as%20having%20been%20elected%20president%20and%20vice%20president%20respectively.%3Cref%3E%7B%7Bcite%20web%7Ctitle%3DPresidential%20Election%20of%201789%7Curl%3Dhttp%3A%2F%2Fwww.mountvernon.org%2Fresearch-collections%2Fdigital-encyclopedia%2Farticle%2Fpresidential-election-of-1789%2F%7Cwebsite%3DGeorge%20Washington%27s%20Mount%20Vernon%7Cpublisher%3DMount%20Vernon%20Ladies%27%20Association%7Caccess-date%3DJanuary%205%2C%202016%7D%7D%3C%2Fref%3E%3Cref%3E%7B%7Bcite%20web%20%7C%20work%3DSenate%20Journal%20%7C%20title%3DJournal%20of%20the%20First%20Session%20of%20the%20Senate%20of%20The%20United%20States%20of%20America%2C%20Begun%20and%20Held%20at%20the%20City%20of%20New%20York%2C%20March%204%2C%201789%2C%20And%20In%20The%20Thirteenth%20Year%20of%20the%20Independence%20of%20the%20Said%20State</p>'
		} })
			.then((res) => {
				assert.ok(res.status === 200);
			});
	});

	it('single html convertion should work properly', () => {
		const uri = localUri('Presidency_of_George_Washington');
		return preq.post({ uri, body: {
			html: '<body id="mwAA" lang="en" class="mw-content-ltr sitedir-ltr ltr mw-body-content parsoid-body mediawiki mw-parser-output"\n' +
                    '\tdir="ltr">\n' +
                    '\t<section data-mw-section-id="1" id="mwAg">\n' +
                    '\t\t<h2 id="Social_activities_and_organizations">Social activities and organizations</h2></section></body>'
		} })
			.then((res) => {
				assert.ok(res.status === 200);
			});
	});

	it('empty section with id=0 convertion should work properly', () => {
		const uri = localUri('Presidency_of_George_Washington');
		return preq.post({ uri, body: {
			html: '<body id="mwAA" lang="en" class="mw-content-ltr sitedir-ltr ltr mw-body-content parsoid-body mediawiki mw-parser-output"\n' +
                    '\tdir="ltr">\n' +
                    '\t<section data-mw-section-id="0" id="mwAQ"></section>\n' +
                    '\t<section data-mw-section-id="1" id="mwAg">\n' +
                    '\t\t<h2 id="Social_activities_and_organizations">Social activities and organizations</h2></section></body>'
		} })
			.then((res) => {
				assert.ok(res.status === 200);
			});
	});
});
