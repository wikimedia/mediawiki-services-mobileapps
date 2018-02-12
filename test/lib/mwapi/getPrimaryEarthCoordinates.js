'use strict';

const assert = require('../../utils/assert.js');
const getGeo = require('../../../lib/mwapi').getPrimaryEarthCoordinates;

describe('lib:mwapi:getPrimaryEarthCoordinates', () => {
    it('gets only primary earth coordinates', () => {
        const testCases = [
            [
                // primary earth coordinates
                [{ lat: 0, lon: 0, primary: '', globe: 'earth' }],
                { latitude: 0, longitude: 0 }
            ],
            [
                // primary earth coordinates (multiple choices)
                [
                    { lat: 0, lon: 0, globe: 'earth' },
                    { lat: 1, lon: 1, primary: '', globe: 'earth' }
                ],
                { latitude: 1, longitude: 1 }
            ],
            [
                // not primary
                [{ lat: 0, lon: 0, globe: 'earth' }],
                undefined
            ],
            [
                // wrong globe
                [{ lat: 0, lon: 0, primary: '', globe: 'moon' }],
                undefined
            ],
        ];
        testCases.forEach((test) => {
            const result = getGeo(test[0]);
            const expected = test[1];
            if (result) {
                assert.deepEqual(result.latitude, expected.latitude);
                assert.deepEqual(result.longitude, expected.longitude);
            } else {
                assert.deepEqual(result, expected);
            }
        });
    });
});
