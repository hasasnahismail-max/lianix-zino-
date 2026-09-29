const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

// إعداد السيرفر مع السماح بالاتصال من أي مكان (CORS)
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('مستخدم متصل الآن:', socket.id);

  // عند استقبال رسالة من أحد الطرفين، يتم تحويلها فوراً للطرف الآخر
  socket.on('send_message', (data) => {
    socket.broadcast.emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log('مستخدم غادر الاتصال');
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`السيرفر يعمل على المنفذ ${PORT}`);
});
