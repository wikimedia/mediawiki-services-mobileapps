const assert = require('../../utils/assert');
const MobileHTML = require('../../../lib/mobile/MobileHTML');
const mRequestUtil = require('../../../lib/mobile/mobile-request-util');

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
});
