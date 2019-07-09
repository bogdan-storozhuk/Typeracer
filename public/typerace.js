import { Commentator } from './commentator';
let text = '';
let correctSymbolsNumber = 0;
let users = [];
let raceFinished = false;
let userFinished = false;

const onChangedConnectedUsers = (socket) => {
    socket.on('changedConnectedUsers', ({
        connectedUsers,
        textLength
    }) => {
        debugger;
        const userList = document.getElementById("userList");
        while (userList.firstChild) {
            userList.removeChild(userList.firstChild);
        }

        let topPlaces = connectedUsers.filter(item => item.position != null);
        let particapants = connectedUsers.filter(item => item.position == null);
        let allParticipants = [
            ...topPlaces.sort((a, b) => a.position - b.position),
            ...particapants.sort((a, b) => b.correctSymbols - a.correctSymbols)
        ];

        allParticipants.forEach(element => {
            const newListItem = document.createElement('li');
            const textElement = document.createTextNode(element.email);
            const progressBar = document.createElement("progress");
            progressBar.setAttribute("value", element.correctSymbols);
            progressBar.setAttribute("max", textLength);

            newListItem.appendChild(textElement);
            newListItem.appendChild(progressBar);

            userList.appendChild(newListItem);
        });

        users = allParticipants;
    });
}

window.onbeforeunload = () => {
    const jwt = localStorage.getItem('jwt');
    document.socket.emit('userDisconnect', {
        token: jwt
    });
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

const highlightText = (correctSymbolsNumber) => {
    const textElement = document.getElementById("typing-words");
    if (correctSymbolsNumber <= 0) {
        textElement.innerHTML = (`<span class='green-symbol'>${text[0]}</span>` + text.slice(1));
    }

    if (correctSymbolsNumber > 0) {
        const nextSymbolIndex = correctSymbolsNumber;
        const correctText = text.slice(0, correctSymbolsNumber);
        const nextSymbol = text[nextSymbolIndex];
        const remainingText = text.slice(nextSymbolIndex + 1);
        const nextSymbolText =  nextSymbol? `<span class='green-symbol'>${nextSymbol}</span>` : '';
        textElement.innerHTML = (`<span class='red-symbols'>${correctText}</span>` 
        + nextSymbolText
        + remainingText);
    }

}

window.onload = () => {

    const jwt = localStorage.getItem('jwt');
    if (!jwt) {
        location.replace('/login');
    } else {
        const socket = io.connect('http://localhost:3000');
        document.socket = socket;
        socket.emit('userConnected', {
            token: jwt
        });
        document.getElementById('txtInput').value = '';

        socket.on('roomClosed', ({
            leftToWait
        }) => {
            const timer = document.getElementById('time');

            let intervalId = setInterval(() => {
                leftToWait--;

                if (leftToWait === 0) {
                    clearInterval(intervalId);
                    location.reload();
                }

                timer.textContent = ` the next race starts in ${leftToWait}`;
            }, 1000);
        });

        const wordsLeft = document.querySelector('#words-left');

        onChangedConnectedUsers(socket);

        socket.on('getTexts', async () => {
            fetch('/texts/', {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer ' + jwt,
                    }
                })
                .then(res => {
                    res.text().then(result => {
                        wordsLeft.innerHTML = text = result;
                        const input = document.getElementById('txtInput');
                        input.removeAttribute('hidden');
                        input.addEventListener('input', (event) => {
                            const target = event.target;
                            const checkedText = target.value;
                            correctSymbolsNumber = getCorrectSymbolsNumber(checkedText, text);
                            highlightText(correctSymbolsNumber);
                            // if(text.length-correctSymbolsNumber===30){
                            //     socket.emit('someoneAlmostAtFinish');
                            // }
                            if (correctSymbolsNumber === text.length && userFinished === false) {
                                userFinished = true;
                                socket.emit('CrossedTheFinishLine', {
                                    token: jwt,
                                });
                            }
                            socket.emit('completedSymbols', {
                                correctSymbols: correctSymbolsNumber,
                                token: jwt,
                            });
                        });
                    })
                }).catch(err => {
                    console.log('request went wrong');
                    location.replace('/login');
                })
        });

        socket.on('timer', ({
            countdown
        }) => {
            if (!raceFinished) {
                const timer = document.getElementById('time');
                timer.textContent = `The next race starts in: ${countdown}`;
            }
        });

        socket.on('raceTimer', ({
            raceTimeCountDown
        }) => {
            const timer = document.getElementById('until-end');
            timer.innerHTML = `<span>${raceTimeCountDown}</span> until the end`;
        });

        socket.on('startRacing', () => {
            document.getElementById('txtInput').removeAttribute('disabled');
            const timer = document.getElementById('time');
            timer.textContent = 'Race has started';
        });

        socket.on('raceFinished', () => {
            document.getElementById('txtInput').setAttribute('disabled', true);
            raceFinished = true;
            let text = '';
            users.forEach((value, index) => {
                text += `${value.email} took ${index + 1} place <br>`;
            });


            const timer = document.getElementById('time');
            timer.innerHTML = text;
            let seconds = 5;
            let showResutInterval = setInterval(() => {
                seconds--;
                if (seconds <= 0) {
                    clearInterval(showResutInterval);
                    location.reload();
                }

            }, 1000);
        });
        const SaySomething = (words) => {
            const TextBubble = document.getElementById('commentatorText');
            TextBubble.textContent = words;
        }
        socket.on('commentatorWelcome', () => {
            const welcomeWords = "На улице сейчас немного пасмурно, но на Львов Арена сейчас просто замечательная атмосфера: двигатели рычат, зрители улыбаются а гонщики едва заметно нервничают и готовят своих железных коней до заезда. А комментировать это все действо Вам буду я, Эскейп Ентерович и я рад вас приветствовать со словами Доброго Вам дня господа!";
            SaySomething(welcomeWords);
        });
        socket.on('commentatorUpdateOnPosition', () => {
            const updateWords = ["На mersedes сейчас первый", "за ним идет", "а третьим идет", "за которым следует"];
            let text = "";
            for (i = 0; i < users.length; i++) {
                text += `${updateWords[i]} ${users[i].email}`;
            }
            SaySomething(text);
        });
        socket.on('AnnounceUserAtFinishLine', ({
            index
        }) => {
            let text = `${users[index].email} пересек финишную прямую.`;
            SaySomething(text);
        });
        socket.on('commentatorAnnouncePlacements', ({
            timeSpent,
            connectedUsers
        }) => {
            const placementsWords = ["Финальный результат: первое место занимает", "второе место занимает", "а третьим пришел", "за которым следует"];
            let text = '';
            for (i = 0; i < users.length; i++) {
                text += `${placementsWords[i]} ${connectedUsers[i].email}`;
            }
            text += `Гонка проходила ${timeSpent} секунд. `;
            SaySomething(text);
        });
        socket.on('commentatorAlmostFinished', ({
            connectedUsers
        }) => {
            const placementsWords = ["До финиша осталось совсем немного и похоже что первым его может пересечь ", "Второе место может остаться", "А третье "];
            let text = '';
            for (i = 0; i < users.length; i++) {
                text += `${placementsWords[i]} ${connectedUsers[i].email}`;
            }
            SaySomething(text);
        });
    }
}