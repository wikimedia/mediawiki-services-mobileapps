/**
 * To retrieve the picture of the day for a given date.
 */

'use strict';

const BBPromise = require('bluebird');
const dateUtil = require('../dateUtil');
const imageinfo = require('../imageinfo');

/**
 * Get imageinfo data for featured image (Picture of the day)
 * @param  {Object} req      req Server request
 * @param  {Object} siteinfo Site info object
 * @return {Object}          featured image response
 */
function promise(req, siteinfo) {
    const aggregated = !!req.query.aggregated;

    if (!dateUtil.validate(dateUtil.hyphenDelimitedDateString(req))) {
        if (aggregated) {
            return BBPromise.resolve({ meta: {} });
        }
        dateUtil.throwDateError();
    }

    return imageinfo.requestPictureOfTheDay(req, dateUtil.getRequestedDate(req), siteinfo)
    .catch((err) => {
        if (aggregated) {
            return BBPromise.resolve({ meta: {} });
        }
        throw err;
    });
}

module.exports = {
    promise,
};
