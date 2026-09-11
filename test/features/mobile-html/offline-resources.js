'use strict';

const preq   = require('preq');
const assert = require('../../utils/assert.js');
const server = require('../../utils/server.js');

describe('mobile-html-offline-resources', function() {

	this.timeout(20000);

	let svc;
	before(async () => {
		svc = await server.start();
	});
	after(async () => await svc.stop());

	const metawikiApiUri = server.config.conf.services[0].conf.mobile_html_rest_api_base_uri
		.replace('{{host}}', 'localhost:8888')
		.replace(/(https|http):\/\//, '//');

	const domain = 'en.wikipedia.org';

	const localApiUri = server.config.conf.services[0]
		.conf.mobile_html_local_rest_api_base_uri_template
		.replace('{{host}}', 'localhost:8888')
		.replace('{{domain}}', domain);

	const localUri = (title, dmn = 'en.wikipedia.org') => `${ server.config.uri }${ dmn }/v1/page/mobile-html-offline-resources/${ title }`;

	it('Response should be array with JS and CSS resources', () => {
		const uri = localUri('Foobar/788941783', domain);

		const expected = [
			`${ metawikiApiUri }data/css/mobile/base`,
			`${ metawikiApiUri }data/css/mobile/pcs`,
			`${ metawikiApiUri }data/javascript/mobile/pcs`,
			`${ metawikiApiUri }data/javascript/mobile/mathjax`,
			`//${ domain }/api/rest_v1/data/css/mobile/site`,
			`${ metawikiApiUri }data/javascript/mobile/mathjax/sre/speech-worker.js`,
			`${ metawikiApiUri }data/javascript/mobile/mathjax/sre/mathmaps/base.json`,
			`${ metawikiApiUri }data/javascript/mobile/mathjax/sre/mathmaps/en.json`,
			`${ metawikiApiUri }data/javascript/mobile/mathjax/fonts/mathjax-newcm-font/svg/dynamic/calligraphic.js`,
			`${ metawikiApiUri }data/javascript/mobile/mathjax/fonts/mathjax-newcm-font/svg/dynamic/double-struck.js`,
			`${ localApiUri }data/i18n/pcs`,
		];

		return preq.get({ uri })
			.then((res) => {
				const response = res.body;
				const headers = res.headers;
				assert.ok(Array.isArray(response));
				assert.ok(expected.every(val => response.includes(val)));
				assert.ok('cache-control' in headers);
				assert.deepEqual(headers['cache-control'], 's-maxage=1209600, max-age=86400');
			});
	});
});
