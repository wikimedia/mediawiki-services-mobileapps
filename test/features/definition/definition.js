'use strict';

const assert = require('../../utils/assert.js');
const preq   = require('preq');
const server = require('../../utils/server.js');

describe('definition', function() {

    this.timeout(20000);

    before(() => server.start());

    it('missing definitions', () => {
        const uri = `${server.config.uri}en.wiktionary.org/v1/page/definition/Dssjbkrt`;
        return preq.get({ uri })
        .then((res) => {
            throw new Error(`Expected an error, but got status: ${res.status}`);
        }, (err) => {
            assert.status(err, 404);
        });
    });

    it('non-term page', () => {
        const uri = `${server.config.uri}en.wiktionary.org/v1/page/definition/Main_page`;
        return preq.get({ uri })
        .then((res) => {
            throw new Error(`Expected an error, but got status: ${res.status}`);
        }, (err) => {
            assert.status(err, 404);
        });
    });

    it('unsupported language', () => {
        const uri = `${server.config.uri}ru.wiktionary.org/v1/page/definition/Baba`;
        return preq.get({ uri })
        .then((res) => {
            throw new Error(`Expected an error, but got status: ${res.status}`);
        }, (err) => {
            assert.status(err, 501);
        });
    });

    it('non-English term on English Wiktionary returns valid results', () => {
        const uri = `${server.config.uri}en.wiktionary.org/v1/page/definition/%E4%B8%AD%E5%9B%BD`;
        return preq.get({ uri })
        .then((res) => {
            assert.status(res, 200);
            assert.ok(Object.keys(res).length !== 0);
        });
    });

    it('translingual term', () => {
        const uri = `${server.config.uri}en.wiktionary.org/v1/page/definition/Toxicodendron`;
        return preq.get({ uri })
        .then((res) => {
            assert.status(res, 200);
            assert.ok(Object.keys(res).length !== 0);
        });
    });
});
