const SaySomething = (words) => {
    const TextBubble = document.getElementById('commentatorText');
    TextBubble.textContent = words;
}

const getCorrectSymbolsNumber = (chekedText, text) => {
    let number = 0;
    for (let i = 0; i < chekedText.length; i++) {
        if (chekedText[i] !== text[i]) {
            break;
        }

        number++;
    }
    return number;
}

const setTextByElementId = (id, text) => {
    const element = document.getElementById(id);
    element.textContent = text;
}

const setHtmlByElementId = (id, html) => {
    const element = document.getElementById(id);
    element.innerHTML = html;
}