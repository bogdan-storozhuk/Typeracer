const path = require('path');
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

server.listen(3000);

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', socket => {

    socket.on('submitMessage', payload => {
        socket.broadcast.emit('newMessage', payload);
        socket.emit('newMessage', payload);
    });

});