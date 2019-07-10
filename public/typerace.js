let text = '';
let correctSymbolsNumber = 0;
let users = [];
let raceFinished = false;
let userFinished = false;
let correctTextFactory = new CorrectTextFactory();

/*               PROXY                       */
let correctTextFactoryProxy = new Proxy(correctTextFactory, {
    get(target, prop) {
        console.log(`Вызов ${prop}`);
        return target[prop];
    }
});

const onChangedConnectedUsers = (socket) => {
    socket.on('changedConnectedUsers', ({
        connectedUsers,
        textLength
    }) => {
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

const highlightText = (correctSymbolsNumber) => {
    setHtmlByElementId("typing-words", correctTextFactoryProxy.createHighlightText(correctSymbolsNumber, text));
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
        const wordsLeft = document.querySelector('#words-left');

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

        onChangedConnectedUsers(socket);

        socket.on('getTexts', () => {
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
                setTextByElementId('time', `The next race starts in: ${countdown}`);
            }
        });

        socket.on('raceTimer', ({
            raceTimeCountDown
        }) => {
            setHtmlByElementId('until-end', `<span>${raceTimeCountDown}</span> until the end`);
        });

        socket.on('startRacing', () => {
            document.getElementById('txtInput').removeAttribute('disabled');
            setTextByElementId('time', 'Race has started');
        });

        socket.on('raceFinished', () => {
            document.getElementById('txtInput').setAttribute('disabled', true);
            raceFinished = true;
            let text = '';
            users.forEach((value, index) => {
                text += `${value.email} took ${index + 1} place <br>`;
            });

            setHtmlByElementId('time', text);
            let seconds = 5;
            let showResutInterval = setInterval(() => {
                seconds--;
                if (seconds <= 0) {
                    clearInterval(showResutInterval);
                    location.reload();
                }

            }, 1000);
        });

        socket.on('commentatorWelcome', () => {
            const welcomeWords = "На улице сейчас немного пасмурно, но на Львов Арена сейчас просто замечательная атмосфера: двигатели рычат, зрители улыбаются а гонщики едва заметно нервничают и готовят своих железных коней до заезда. А комментировать это все действо Вам буду я, Эскейп Ентерович и я рад вас приветствовать со словами Доброго Вам дня господа!";
            SaySomething(welcomeWords);
        });
        socket.on('commentatorUpdateOnPosition', ({
            raceTimeCountDown
        }) => {
            const updateWords = ["На mersedes сейчас первый", " ,за ним идет", " ,а третьим идет", " ,за которым следует"];
            let text = "";
            for (i = 0; i < users.length; i++) {
                let typeDifference = users[i + 1] ? `с преимуществом в ${users[i].correctSymbols-users[i+1].correctSymbols} букв` : '';
                text += `${updateWords[i]} ${users[i].email} ${typeDifference}`;
            }
            text += `. До конца гонки ${raceTimeCountDown} секунд`;
            SaySomething(text);
        });
        socket.on('commentatorAnnounceUserAtFinishLine', ({
            index
        }) => {
            let text = `Финишную прямую пересек ${users[index].email}.`;
            SaySomething(text);
        });
        socket.on('commentatorAnnouncePlacements', ({
            timeSpent,
            connectedUsers
        }) => {
            const placementsWords = ["Финальный результат: первое место занимает", " ,второе место занимает", " ,а третьим пришел", " ,за которым следует"];
            let text = '';
            for (i = 0; i < users.length; i++) {
                text += `${placementsWords[i]} ${connectedUsers[i].email}`;
            }
            text += `.Гонка проходила ${timeSpent} секунд. `;
            SaySomething(text);
        });
        socket.on('commentatorAlmostFinished', ({
            connectedUsers
        }) => {
            const placementsWords = ["До финиша осталось совсем немного и похоже что первым его может пересечь", " ,второе место может остаться", " ,а третье", " ,четвертое же"];
            let text = '';
            for (i = 0; i < users.length; i++) {
                text += `${placementsWords[i]} ${connectedUsers[i].email}`;
            }
            SaySomething(text);
        });
        socket.on('commentatorAnnounceRacers', ({
            connectedUsers
        }) => {
            let text = 'Гонка только началась, а тем временем, список гонщиков:';
            const placementsWords = ["На ferrari под номером 1", ", под номером 2", ", а номером 3", ", номером 4 же"];
            for (i = 0; i < users.length; i++) {
                text += `${placementsWords[i]} ${connectedUsers[i].email}`;
            }
            SaySomething(text);
        });
        socket.on('commentatorFacts', () => {
            fetch('/facts/', {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer ' + jwt,
                    }
                })
                .then(res => {
                    res.text().then(result => {
                        SaySomething(result);
                    })
                }).catch(err => {
                    console.log('request went wrong');
                    location.replace('/login');
                })
        });
    }
}