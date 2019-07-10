/*          Factory        */
class CorrectTextFactory {
    createHighlightText(correctSymbolsNumber, text) {

        if (correctSymbolsNumber <= 0) {
            return (`<span class='green-symbol'>${text[0]}</span>` + text.slice(1));
        }

        const nextSymbolIndex = correctSymbolsNumber;
        const correctText = text.slice(0, correctSymbolsNumber);
        const nextSymbol = text[nextSymbolIndex];
        const remainingText = text.slice(nextSymbolIndex + 1);
        const nextSymbolText = nextSymbol ? `<span class='green-symbol'>${nextSymbol}</span>` : '';
        return (`<span class='red-symbols'>${correctText}</span>` +
            nextSymbolText +
            remainingText);
    }
}