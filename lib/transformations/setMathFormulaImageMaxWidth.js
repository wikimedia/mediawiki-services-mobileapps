/**
 * DOM transformation shared with app. Let's keep this in sync with the app.
 * Last sync: Android repo 3d5b441 www/js/transforms/setMathFormulaImageMaxWidth.js
 */

'use strict';

function setMathFormulaImageMaxWidth( content ) {
    // Prevent horizontally scrollable pages by checking for math formula images (which are
    // often quite wide), and explicitly setting their maximum width to fit the viewport.
    var allImgs = content.querySelectorAll( 'img' );
    for ( var i = 0; i < allImgs.length; i++ ) {
        var imgItem = allImgs[i];
        // is the image a math formula?
        for ( var c = 0; c < imgItem.classList.length; c++ ) {
            if (imgItem.classList[c].indexOf("math") > -1) {
                imgItem.style.maxWidth = "100%";
            }
        }
    }
}

module.exports = {
    setMathFormulaImageMaxWidth: setMathFormulaImageMaxWidth
};
