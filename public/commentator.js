let commentatorDictionary = {
    "race": `Гонка проходила ${0} секунд`,
}


/*class Commentator {
    say (text, arg)  {
        //const TextBubble = document.getElementById('commentatorText');
       // TextBubble.textContent = text;
       console.log('123');
       console.log(text, arg);
    } 
  }*/

let commentator = {
    say(text, arg) {
        console.log('12346');
        console.log(text, arg);
    }
};


let proxy = new Proxy(commentator, {
    say (text, arg)  {
        console.log('test');
        if (commentatorDictionary.indexOf(text) !== -1) {
            console.log(commentatorDictionary[text]);
            return target.say(commentatorDictionary[text], arg);
        }

        console.log('test');
        commentator.say(text);
    }
});

proxy.say("race", 1);