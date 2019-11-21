'use strict';

const api = require('./api-util');
const dateUtil = require('./dateUtil');

/**
 * @readonly
 * @enum {!string}
 */
module.exports.Platform = {
    ALL: 'all-access',
    DESKTOP_WEB: 'desktop',
    MOBILE_WEB: 'mobile-web',
    MOBILE_APP: 'mobile-app'
};

/**
 * @readonly
 * @enum {!string}
 */
module.exports.Agent = {
    ALL: 'all-agents',
    USER: 'user',
    SPIDER: 'spider',
    BOT: 'bot'
};

/**
 * @readonly
 * @enum {!string}
 */
module.exports.Granularity = {
    DAILY: 'daily'
};

/**
 * @private {!Object} app
 * @private {!string} apiDomain RESTBase API domain; e.g., wikimedia.org
 * @private {!Object} req
 */
module.exports.Client = class {
    /**
     * @param {!Object} req original Request object
     * @param {!Object} restReq new Request object for the Pageviews API
     */
    constructor(req, restReq) {
        this.req = req;
        this.restReq = restReq;
    }

    /**
     * @param {!string} domain Top level project domain to filter; e.g., de.wikipedia
     * @param {!Platform} platform Device platform to filter
     * @param {!Agent} agent User agent to filter
     * @param {!string} title Normalized article title
     * @param {!Granularity} granularity Result time unit
     * @param {!Date} start Inclusive start date
     * @param {!Date} end Inclusive end date
     * @return {!Promise} Daily pageviews on domain from platform for title from [start, end]
    */
    reqPage(domain, platform, agent, title, granularity, start, end) {
        const titleEncoded = encodeURIComponent(title);
        const startStr = dateUtil.formatYYYYMMDD(start);
        const endStr = dateUtil.formatYYYYMMDD(end);
        const path = `metrics/pageviews/per-article/${domain}/${platform}/${agent}/${titleEncoded}/${granularity}/${startStr}/${endStr}`;
        return api
            .restApiGet(this.req, path, this.restReq)
            .then(api.checkResponseStatus);
    }

    /**
     * @param {!string} domain Top level project domain to filter; e.g., de.wikipedia
     * @param {!Platform} platform Device platform to filter
     * @param {!Date} date
     * @return {!Promise} Top pageviews on domain from platform for date
    */
    reqTop(domain, platform, date) {
        const year = date.getUTCFullYear();
        const month = dateUtil.pad(date.getUTCMonth() + 1);
        const day = dateUtil.pad(date.getUTCDate());
        const path = `metrics/pageviews/top/${domain}/${platform}/${year}/${month}/${day}`;
        return api
            .restApiGet(this.req, path, this.restReq)
            .then(api.checkResponseStatus);
    }
};
