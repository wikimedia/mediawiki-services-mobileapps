'use strict';

const assert = require('../../utils/assert.js');
const preq   = require('preq');
const server = require('../../utils/server.js');
const nock   = require('nock');

describe('description', function() {

	this.timeout(20000);

	let svc;
	before(async () => {
		svc = await server.start();
	});
	after(async () => await svc.stop());

	describe('GET', () => {
		it('missing description, enwiki', () => {
			const uri = `${ server.config.uri }en.wikipedia.org/v1/page/description/Dssjbkrt`;
			return preq.get({ uri })
				.then((res) => {
					throw new Error(`Expected an error, but got status: ${ res.status }`);
				}, (err) => {
					assert.status(err, 404);
				});
		});

		it('missing description, other wiki', () => {
			const uri = `${ server.config.uri }ru.wikipedia.org/v1/page/description/Dssjbkrt`;
			return preq.get({ uri })
				.then((res) => {
					throw new Error(`Expected an error, but got status: ${ res.status }`);
				}, (err) => {
					assert.status(err, 404);
				});
		});

		it('ok description, enwiki', () => {
			const uri = `${ server.config.uri }en.wikipedia.org/v1/page/description/San_Francisco`;
			return preq.get({ uri })
				.then((res) => {
					assert.status(res, 200);
					assert.contentType(res,'application/json');
					assert.ok('content-language' in res.headers);
					assert.deepEqual('en', res.headers['content-language']);
					assert.ok('description' in res.body);
				});
		});

		it('ok description, ru wiki', () => {
			const uri = `${ server.config.uri }ru.wikipedia.org/v1/page/description/%D0%A1%D0%B0%D0%BD%D0%BA%D1%82-%D0%9F%D0%B5%D1%82%D0%B5%D1%80%D0%B1%D1%83%D1%80%D0%B3`;
			return preq.get({ uri })
				.then((res) => {
					assert.status(res, 200);
					assert.contentType(res,'application/json');
					assert.ok('content-language' in res.headers);
					assert.deepEqual('ru', res.headers['content-language']);
					assert.ok('description' in res.body);
				});
		});
	});

	function setUpTokenMock(api, response) {
		api.post('/w/api.php', {
			action: 'query',
			meta: 'tokens',
			type: 'csrf',
			format: 'json',
			formatversion: 2
		})
			.reply(200, Object.assign(response, {
				servedby: 'nock'
			}));
	}

	function setUpDescriptionMock(api, request, result) {
		api.post('/w/api.php', Object.assign({
			action: 'wbsetdescription',
			title: 'Fake',
			format: 'json',
			formatversion: 2,
			language: 'fake',
			site: 'fakewiki'
		}, request))
			.reply(200, result);
	}

	function setUpPageRequestMock(api, request, result) {
		api.post('/w/api.php', Object.assign({
			action: 'query',
			prop: 'revisions',
			titles: 'Fake',
			rvslots: 'main',
			rvprop: 'ids|content',
			format: 'json',
			formatversion: 2,
		}, request))
			.reply(200, result);
	}

	function failedTokenTest(requestMethod, local) {
		const api = nock(local ? 'https://en.wikipedia.org' : 'https://www.wikidata.org');
		setUpTokenMock(api, {
			error: {
				code: 'badtoken',
				info: "Can't get the token"
			}
		});
		const reqDomain = local ? 'en.wikipedia.org' : 'fake.fakepedia.org';
		const uri = `${ server.config.uri }${ reqDomain }/v1/page/description/Fake`;
		return preq[requestMethod]({
			uri,
			headers: {
				'content-type': 'application/json'
			},
			body: {
				description: 'Test description',
				comment: 'Test test'
			}
		})
			.then((res) => {
				throw new Error(`Expected an error, but got status: ${ res.status }`);
			}, (err) => {
				assert.status(err, 401);
			})
			.then(() => {
				api.done();
			})
			.finally(() => {
				nock.cleanAll();
			});
	}

	function failedFetchPageTest(requestMethod) {
		const api = nock('https://en.wikipedia.org',{
			reqheaders: {
				authorization: 'Basic Auth Header'
			},
		});
		setUpTokenMock(api, {
			query: {
				tokens: {
					csrftoken: 'TOKENTOKEN'
				}
			}
		});
		setUpPageRequestMock(api, {
			titles: 'Testing'
		}, {
			query: {
				pages: [ {
					title: 'Testing',
					missing: true
				} ]
			}
		});

		const uri = `${ server.config.uri }en.wikipedia.org/v1/page/description/Testing`;
		return preq[requestMethod]({
			uri,
			headers: {
				'content-type': 'application/json',
				authorization: 'Basic Auth Header'
			},
			body: {
				description: 'Test description',
				comment: 'Test test'
			}
		})
			.then((res) => {
				throw new Error(`Expected an error, but got status: ${ res.status }`);
			}, (err) => {
				assert.status(err, 404);
			})
			.then(() => {
				api.done();
			})
			.finally(() => {
				nock.cleanAll();
			});
	}

	describe('PUT', () => {
		before(() => {
			if (!nock.isActive()) {
				nock.activate();
			}
		});

		it('failed fetching token, central', () => failedTokenTest('put', false));
		it('failed fetching token, local', () => failedTokenTest('put', true));
		it('failed fetching page, local', () => failedFetchPageTest('put'));

		it('missing required parameter', () => {
			const uri = `${ server.config.uri }fake.fakepedia.org/v1/page/description/Fake`;
			return preq.put({
				uri,
				headers: {
					'content-type': 'application/json'
				},
				body: {
					comment: 'Test comment'
				}
			})
				.then((res) => {
					throw new Error(`Expected an error, but got status: ${ res.status }`);
				}, (err) => {
					assert.status(err, 400);
				});
		});

		it('set central description: fail', () => {
			const api = nock('https://www.wikidata.org',{
				reqheaders: {
					authorization: 'Basic Auth Header'
				},
			});
			setUpTokenMock(api, {
				query: {
					tokens: {
						csrftoken: 'TOKENTOKEN'
					}
				}
			});
			setUpDescriptionMock(api, {
				token: 'TOKENTOKEN',
				value: 'Test description',
				summary: 'Test comment'
			}, {
				error: {
					title: 'test'
				}
			});
			const uri = `${ server.config.uri }fake.fakepedia.org/v1/page/description/Fake`;
			return preq.put({
				uri,
				headers: {
					'content-type': 'application/json',
					authorization: 'Basic Auth Header'
				},
				body: {
					description: 'Test description',
					comment: 'Test comment'
				},
				retries: 0
			})
				.then((res) => {
					throw new Error(`Expected an error, but got status: ${ res.status }`);
				}, (err) => {
					assert.status(err, 500);
					assert.deepEqual({ title: 'test' }, err.body.detail);
				})
				.then(() => {
					api.done();
				})
				.finally(() => {
					nock.cleanAll();
				});
		});

		it('set central description', () => {
			const api = nock('https://www.wikidata.org',{
				reqheaders: {
					authorization: 'Basic Auth Header'
				},
			});
			setUpTokenMock(api, {
				query: {
					tokens: {
						csrftoken: 'TOKENTOKEN'
					}
				}
			});
			setUpDescriptionMock(api, {
				token: 'TOKENTOKEN',
				value: 'Test description',
				summary: 'Test comment'
			}, {
				entity: {
					descriptions: {
						fake: {
							value: 'Test description really',
							language: 'fake'
						}
					}
				}
			});
			const uri = `${ server.config.uri }fake.fakepedia.org/v1/page/description/Fake`;
			return preq.put({
				uri,
				headers: {
					'content-type': 'application/json',
					authorization: 'Basic Auth Header'
				},
				body: {
					description: 'Test description',
					comment: 'Test comment'
				}
			})
				.then((res) => {
					assert.status(res, 201);
					assert.contentType(res, 'application/json');
					assert.ok('content-language' in res.headers);
					assert.deepEqual('fake', res.headers['content-language']);
					assert.deepEqual({
						description: 'Test description really'
					}, res.body);
				})
				.then(() => {
					api.done();
				})
				.finally(() => {
					nock.cleanAll();
				});
		});

		it('set central description, variant', () => {
			const api = nock('https://www.wikidata.org',{
				reqheaders: {
					authorization: 'Basic Auth Header'
				},
			});
			setUpTokenMock(api, {
				query: {
					tokens: {
						csrftoken: 'TOKENTOKEN'
					}
				}
			});
			setUpDescriptionMock(api, {
				token: 'TOKENTOKEN',
				value: 'Test description',
				summary: 'Test comment',
				site: 'srwiki',
				language: 'sr-Latn',
			}, {
				entity: {
					descriptions: {
						'sr-Latn': {
							value: 'Test description really',
							language: 'sr-Latn'
						}
					}
				}
			});
			const uri = `${ server.config.uri }sr.wikipedia.org/v1/page/description/Fake`;
			return preq.put({
				uri,
				headers: {
					'content-type': 'application/json',
					authorization: 'Basic Auth Header',
					'content-language': 'sr-Latn'
				},
				body: {
					description: 'Test description',
					comment: 'Test comment'
				}
			})
				.then((res) => {
					assert.status(res, 201);
					assert.contentType(res, 'application/json');
					assert.ok('content-language' in res.headers);
					assert.deepEqual('sr-Latn', res.headers['content-language']);
					assert.deepEqual({
						description: 'Test description really'
					}, res.body);
				})
				.then(() => {
					api.done();
				})
				.finally(() => {
					nock.cleanAll();
				});
		});
		it('set local description', () => {
			const api = nock('https://en.wikipedia.org',{
				reqheaders: {
					authorization: 'Basic Auth Header'
				},
			});
			setUpTokenMock(api, {
				query: {
					tokens: {
						csrftoken: 'TOKENTOKEN'
					}
				}
			});
			setUpPageRequestMock(api, {
				titles: 'Testing'
			}, {
				query: {
					pages: [ {
						title: 'Testing',
						pageid: 123,
						revisions: [
							{
								revid: 321,
								slots: {
									main: {
										contentmodel: 'wikitext',
										content: 'Hello!'
									}
								}
							}
						]
					} ]
				}
			});

			api.post('/w/api.php', {
				action: 'edit',
				pageid: 123,
				summary: 'Test comment',
				minor: true,
				baserevid: 321,
				prependtext: '{{Short description|Test description}}',
				token: 'TOKENTOKEN',
				format: 'json',
				formatversion: 2
			})
				.reply(200, {
					edit: {
						result: 'Success'
					}
				});

			const uri = `${ server.config.uri }en.wikipedia.org/v1/page/description/Testing`;
			return preq.put({
				uri,
				headers: {
					'content-type': 'application/json',
					authorization: 'Basic Auth Header'
				},
				body: {
					description: 'Test description',
					comment: 'Test comment'
				}
			})
				.then((res) => {
					assert.status(res, 201);
					assert.contentType(res, 'application/json');
					assert.ok('content-language' in res.headers);
					assert.deepEqual({
						description: 'Test description'
					}, res.body);
				})
				.then(() => {
					api.done();
				})
				.finally(() => {
					nock.cleanAll();
				});
		});
	});

	describe('DELETE', () => {
		before(() => {
			if (!nock.isActive()) {
				nock.activate();
			}
		});

		it('failed fetching token, central', () => failedTokenTest('delete', false));
		it('failed fetching token, local', () => failedTokenTest('delete', true));
		it('failed fetching page, local', () => failedFetchPageTest('delete'));

		it('delete description', () => {
			const api = nock('https://www.wikidata.org', {
				reqheaders: {
					authorization: 'Basic Auth Header'
				}
			});
			setUpTokenMock(api, {
				query: {
					tokens: {
						csrftoken: 'TOKENTOKEN'
					}
				}
			});
			setUpDescriptionMock(api, {
				token: 'TOKENTOKEN',
				value: '',
				summary: ''
			}, {
				entity: {
					descriptions: {
						some_other: {
							value: 'Test description really',
							language: 'fake'
						}
					}
				}
			});
			const uri = `${ server.config.uri }fake.fakepedia.org/v1/page/description/Fake`;
			return preq.delete({
				uri,
				headers: {
					authorization: 'Basic Auth Header'
				}
			})
				.then((res) => {
					assert.status(res, 204);
				})
				.then(() => {
					api.done();
				})
				.finally(() => {
					nock.cleanAll();
				});
		});
	});
	it('delete local description', () => {
		const api = nock('https://en.wikipedia.org',{
			reqheaders: {
				authorization: 'Basic Auth Header'
			},
		});
		setUpTokenMock(api, {
			query: {
				tokens: {
					csrftoken: 'TOKENTOKEN'
				}
			}
		});
		setUpPageRequestMock(api, {
			titles: 'Testing'
		}, {
			query: {
				pages: [ {
					title: 'Testing',
					pageid: 123,
					revisions: [
						{
							revid: 321,
							slots: {
								main: {
									contentmodel: 'wikitext',
									content: '{{Short description|Test description}}Hello!'
								}
							}
						}
					]
				} ]
			}
		});

		api.post('/w/api.php', {
			action: 'edit',
			pageid: 123,
			summary: 'Test comment',
			minor: true,
			baserevid: 321,
			text: 'Hello!',
			token: 'TOKENTOKEN',
			format: 'json',
			formatversion: 2
		})
			.reply(200, {
				edit: {
					result: 'Success'
				}
			});

		const uri = `${ server.config.uri }en.wikipedia.org/v1/page/description/Testing`;
		return preq.delete({
			uri,
			headers: {
				'content-type': 'application/json',
				authorization: 'Basic Auth Header'
			},
			body: {
				comment: 'Test comment'
			}
		})
			.then((res) => {
				assert.status(res, 204);
			})
			.then(() => {
				api.done();
			})
			.finally(() => {
				nock.cleanAll();
			});
	});
});
