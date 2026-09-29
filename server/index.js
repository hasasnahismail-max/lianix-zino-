const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['polling', 'websocket']
});

io.on('connection', (socket) => {
  console.log('مستخدم متصل:', socket.id);

  // إعادة بث الرسالة للجميع مع إرفاق معرف جهاز المرسل
  socket.on('send_message', (data) => {
    io.emit('receive_message', {
      ...data,
      senderId: socket.id
    });
  });

  socket.on('disconnect', () => {
    console.log('مستخدم غادر');
  });
});

app.use(express.static(path.join(__dirname, '../client/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
