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
const raceTime = 180;
let countdown = 10;
let raceTimeCountDown = 180;
const getRandomNumber = (min, max) => Math.floor(Math.random() * (max - min)) + min;
let textId = getRandomNumber(0, 3);
let connectedUsers = [];
let raceStarted = false;
let raceFinished = false;
let textLength;
let room = 'room1';
let position = 0;
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
  textLength = result[textId].length;
  res.send(result[textId]);
});
app.get('/facts', passport.authenticate('jwt', {
  session: false
}), function (req, res) {

  let rawdata = fs.readFileSync(path.join(__dirname, 'facts.json'));
  let result = JSON.parse(rawdata);
  textLength = result[textId].length;
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
  raceFinished = false;
  io.in(room).emit('commentatorAnnounceRacers', {
    connectedUsers
  });
  raceTimeCountDown = raceTime;
  let raceIntervalId = setInterval(() => {

    raceTimeCountDown--;
    io.in(room).emit('raceTimer', {
      raceTimeCountDown
    });
    if (raceTimeCountDown % 30 == 0 && raceFinished == false) {
      io.in(room).emit('commentatorUpdateOnPosition', {
        raceTimeCountDown
      });
    }
    if (raceTimeCountDown % 15 == 0 && raceTimeCountDown % 30 != 0 && raceFinished == false) {
      io.in(room).emit('commentatorFacts');
    }

    if (raceTimeCountDown <= 0) {
      raceStarted = false;
      clearInterval(raceIntervalId);
      io.in(room).emit('raceFinished');
      connectedUsers = [];
      position = 0;
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
      connectedUsers,
      textLength
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
        correctSymbols: 0,
        Isfinished: false
      });
    }

    socket.emit("commentatorWelcome");


    io.in(room).emit("changedConnectedUsers", {
      connectedUsers,
      textLength
    });
    io.in(room).emit('getTexts');
  });

  socket.on('completedSymbols', ({
    token,
    correctSymbols
  }) => {
    const email = jwt.decode(token).login;
    const index = connectedUsers.findIndex(item => item.email === email);
    if (index !== -1) {
      connectedUsers[index].correctSymbols = correctSymbols;
      if (connectedUsers[index].correctSymbols == textLength - 30) {
        io.in(room).emit("commentatorAlmostFinished", {
          connectedUsers
        });
      }
      io.in(room).emit("changedConnectedUsers", {
        connectedUsers,
        textLength
      });
    }
  });

  socket.on('CrossedTheFinishLine', ({
    token
  }) => {
    const email = jwt.decode(token).login;
    const index = connectedUsers.findIndex(item => item.email === email);
    if (index !== -1) {
      connectedUsers[index].Isfinished = true;
      connectedUsers[index].position = position++;
      io.in(room).emit("commentatorAnnounceUserAtFinishLine", {
        index
      });
      if (connectedUsers.every(user => user.Isfinished === true)) {
        position = 0;
        raceFinished = true;
        io.in(room).emit('raceFinished');
        let timeSpent = raceTime - raceTimeCountDown;
        io.in(room).emit('commentatorAnnouncePlacements', {
          timeSpent,
          connectedUsers
        });
        raceTimeCountDown = 1;
      }
    }
  });
});