const path = require('path');
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const jwt = require('jsonwebtoken');
const passport = require('passport');
const bodyParser = require('body-parser');
const users = require('./users.json');
const fs = require('fs');
const waitingTime = 20;
const raceTime = 50;
let countdown = 20;
let raceTimeCountDown = 60;
const getRandomNumber = (min, max) => Math.floor(Math.random() * (max - min)) + min;
let textId = getRandomNumber(0, 3);
let connectedUsers = [];
let raceStarted = false;
let room = 'room1';
require('./passport.config');

server.listen(3000);

app.use(express.static(path.join(__dirname, 'public')));
app.use(passport.initialize());
app.use(bodyParser.json());

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/chat', /*passport.authenticate('jwt'),*/ function (req, res) {
  res.sendFile(path.join(__dirname, 'chat.html'));
});
app.get('/typerace', /*passport.authenticate('jwt'),*/ function (req, res) {
  res.sendFile(path.join(__dirname, 'typerace.html'));
});
app.get('/texts', passport.authenticate('jwt', {
  session: false
}), function (req, res) {

  let rawdata = fs.readFileSync(path.join(__dirname, 'texts.json'));
  let result = JSON.parse(rawdata);
  res.send(result[textId]);
});


app.get('/login', function (req, res) {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.post('/login', function (req, res) {
  const userFromReq = req.body;
  const userInDB = users.find(user => user.login === userFromReq.login);
  if (userInDB && userInDB.password === userFromReq.password) {
    const token = jwt.sign(userFromReq, 'secret', {
      expiresIn: '24h'
    });
    res.status(200).json({
      auth: true,
      token
    });
  } else {
    res.status(401).json({
      auth: false
    });
  }
});

const startRace = () => {
  raceTimeCountDown = raceTime;
  let raceIntervalId = setInterval(() => {

    raceTimeCountDown--;
    io.in(room).emit('raceTimer', {
      raceTimeCountDown
    });


    if (raceTimeCountDown <= 0) {
      raceStarted = false;
      clearInterval(raceIntervalId);
      io.in(room).emit('raceFinished');
      connectedUsers = [];
      textId = getRandomNumber(0, 3);
      startAwaitingUsersInteval();
    }
  }, 1000);
}


const startAwaitingUsersInteval = () => {
  countdown = waitingTime;
  let intervalId = setInterval(() => {
    countdown--;
    io.in(room).emit('timer', {
      countdown
    });

    if (countdown === 0 && connectedUsers.length === 0) {
      countdown = 20;
    }

    if (countdown <= 0 && connectedUsers.length > 0) {
      raceStarted = true;
      clearInterval(intervalId);
      io.in(room).emit('startRacing');
      startRace();
    }
  }, 1000);
}


startAwaitingUsersInteval();


io.on('connection', socket => {

  socket.on('userDisconnect', ({
    token
  }) => {
    const email = jwt.decode(token).login;
    connectedUsers = connectedUsers.filter(item => item.email !== email);
    io.in(room).emit("changedConnectedUsers", {
      connectedUsers
    });
  });


  socket.on('userConnected', ({
    token
  }) => {


    if (raceStarted) {
      socket.emit("roomClosed", {
        leftToWait: raceTimeCountDown + waitingTime - 2
      });
      return;
    }

    socket.join(room);

    const userLogin = jwt.decode(token).login;

    if (connectedUsers.findIndex(item => item.email === -1)) {
      connectedUsers.push({
        email: userLogin,
        percent: 0
      });
    }

    io.in(room).emit("changedConnectedUsers", {
      connectedUsers,
    });
    io.in(room).emit('getTexts');
  });

  socket.on('completedPercent', ({
    token,
    percent
  }) => {
    const email = jwt.decode(token).login;
    const index = connectedUsers.findIndex(item => item.email === email);
    if (index !== -1) {
      connectedUsers[index].percent = percent;
      io.in(room).emit("changedConnectedUsers", {
        connectedUsers
      });
    }
  });
});