const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ['polling', 'websocket'],
  maxHttpBufferSize: 1e8 
});

const activeUsers = {};

io.on('connection', (socket) => {
  socket.on('register_user', (userData) => {
    if (userData && userData.token) {
      activeUsers[socket.id] = userData;
      socket.join(userData.token);
      io.emit('online_users', Object.values(activeUsers));
    }
  });

  socket.on('join_chat_room', (roomId) => {
    socket.join(roomId);
  });

  socket.on('send_private_message', (data) => {
    io.to(data.roomId).emit('receive_private_message', {
      ...data,
      senderId: socket.id
    });
  });

  socket.on('typing', (data) => {
    socket.to(data.roomId).emit('user_typing', { senderId: socket.id });
  });

  socket.on('stop_typing', (data) => {
    socket.to(data.roomId).emit('user_stop_typing', { senderId: socket.id });
  });

  socket.on('disconnect', () => {
    delete activeUsers[socket.id];
    io.emit('online_users', Object.values(activeUsers));
  });
});

app.use(express.static(path.join(__dirname, '../client/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`LIANIX Secure Server running on port ${PORT}`);
});
