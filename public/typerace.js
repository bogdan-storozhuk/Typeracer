let text = '';
let correctSymbolsNumber = 0;
let users = [];
let raceFinished = false;
const onChangedConnectedUsers = (socket) => {
    socket.on('changedConnectedUsers', ({
        connectedUsers
    }) => {
        const userList = document.getElementById("userList");
        while (userList.firstChild) {
            userList.removeChild(userList.firstChild);
        }

        connectedUsers.sort((a, b) => b.percent - a.percent);
        connectedUsers.forEach(element => {
            const newListItem = document.createElement('li');
            const textElement = document.createTextNode(element.email);
            const progressBar = document.createElement("progress");
            progressBar.setAttribute("value", element.percent);
            progressBar.setAttribute("max", "100");

            newListItem.appendChild(textElement);
            newListItem.appendChild(progressBar);

            userList.appendChild(newListItem);
        });

        users = connectedUsers;
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
        textElement.innerHTML = (`<span class='red-symbols'>${correctText}</span>` +
            `<span class='green-symbol'>${nextSymbol}</span>` + remainingText);
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
                            socket.emit('completedPercent', {
                                percent: (correctSymbolsNumber / text.length) * 100,
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
    }
}