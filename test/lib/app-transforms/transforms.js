'use strict';

var fs = require('fs');
var preq = require('preq');
var domino = require('domino');
var assert = require('../../utils/assert.js');
var a = require('../../../lib/transformations/anchorPopUpMediaTransforms');
var html = fs.readFileSync(__dirname + '/bill-clinton.html', 'utf-8');

describe('lib:app-transforms', function() {
    it('fixVideoAnchor should apply app_media class to all video anchors', function() {
        var doc = domino.createDocument(html);
        a.fixVideoAnchor(doc);
        var videoThumbImgElements = doc.querySelectorAll('a[href] > img[data-file-type="video"]');
        var haveAppMedia = 0;
        for (var i = 0, n = videoThumbImgElements.length; i < n; i++) {
            var elem = videoThumbImgElements[i];
            for (var j = 0, m = elem.parentNode.classList.length; j < m; j++) {
                if (elem.parentNode.classList[j] === 'app_media') {
                    haveAppMedia++;
                }
            }
        }
        assert.ok(videoThumbImgElements.length === 3, 'Failed to find video thumb img elements');
        assert.deepEqual(haveAppMedia, videoThumbImgElements.length);
    });
});