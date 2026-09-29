const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

const server = http.createServer(app);

// زيادة حجم الحزمة المسموحة إلى 100 ميجابايت لنقل الصور والفيديوهات المشفّرة
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['polling', 'websocket'],
  maxHttpBufferSize: 1e8 
});

io.on('connection', (socket) => {
  // الانضمام إلى غرفة محددة
  socket.on('join_room', (room) => {
    socket.join(room);
  });

  // بث الرسالة والميديا فقط لأعضاء نفس الغرفة
  socket.on('send_message', (data) => {
    io.to(data.room).emit('receive_message', {
      ...data,
      senderId: socket.id
    });
  });

  // أحداث جاري الكتابة (الإيموجي المتكلم)
  socket.on('typing', (data) => {
    socket.to(data.room).emit('user_typing', { senderId: socket.id });
  });

  socket.on('stop_typing', (data) => {
    socket.to(data.room).emit('user_stop_typing', { senderId: socket.id });
  });

  socket.on('disconnect', () => {});
});

app.use(express.static(path.join(__dirname, '../client/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
