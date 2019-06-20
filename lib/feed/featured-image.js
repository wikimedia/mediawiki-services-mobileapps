/**
 * To retrieve the picture of the day for a given date.
 */

'use strict';

const BBPromise = require('bluebird');
const dateUtil = require('../dateUtil');
const sUtil = require('../util');
const imageinfo = require('../imageinfo');
const HTTPError = sUtil.HTTPError;

/**
 * Get imageinfo data for featured image (Picture of the day)
 * @param  {Object} app      App object
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
        if (err.status === 504) {
            if (aggregated) {
                return BBPromise.resolve({ meta: {} });
            }
            throw new HTTPError({
                status: 404,
                type: 'not_found',
                title: 'No picture of the day for this date',
                detail: 'There is no picture of the day for this date.'
            });
        } else {
            throw err;
        }
    });
}

module.exports = {
    promise,
};
