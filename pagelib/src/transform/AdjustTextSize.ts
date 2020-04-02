/**
 * Sets text size adjustment percentage of the body element
 * @param  {!HTMLBodyElement} body that needs the margins adjusted.
 * @param  {!string} textSize percentage for text-size-adjust in format of string, like '100%'
 * @return {void}
 */
const setPercentage = (body: HTMLBodyElement, textSize: string): void => {
    if (textSize){
        // '-webkit-text-size-adjust' is broken on iPadOS 13: https://bugs.webkit.org/show_bug.cgi?id=201404
        // This hacky code allows us to adjust font sizes, instead of the convenient 2 lines commented
        // out at the bottom of this function. Once (Apple fixes this bug and) the iPadOS versions
        // with the bug have become an insignificant amount of our app usage, we can delete the following
        // few lines and reactivate the two commented-out lines at the end of this function.

        // Notably, as of April 2020, this function is used by iOS but not Android.
        // Android updates text size w/ `webView.getSettings().setDefaultFontSize(...)`.

        // remove percent sign
        const requestedTextSizeNumber = Number(textSize.slice(0, -1));

        // Base.css applies a font-size of .9411764706, per discussion w/ Carolyn
        // we're going to round that to 95% for now.
        const calculatedStartPercent = .95;

        const calculatedSize = (requestedTextSizeNumber/100) * calculatedStartPercent;
        const calculatedSizeString = (calculatedSize*100).toString() + "%";
        (<any>body.style)['font-size'] = calculatedSizeString;

        // casting body style to avoid errors with the subscript operator and typescript
        // see https://stackoverflow.com/questions/37655393
        // (<any>body.style)['-webkit-text-size-adjust'] = textSize;
        // (<any>body.style)['text-size-adjust'] = textSize;
    }
}


export default {
    setPercentage
}