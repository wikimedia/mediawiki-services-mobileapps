'use strict';

function pad(number) {
    if (number < 10) {
        return '0' + number;
    }
    return number;
}

module.exports = {
    pad: pad
}