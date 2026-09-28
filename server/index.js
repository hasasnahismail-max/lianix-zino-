const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log(`[+] مستخدم تكتيكي متصل: ${socket.id}`);

  // استقبال وإذاعة الرسائل المشفرة بين الأطراف
  socket.on('send_message', (data) => {
    console.log(`[SECURE RELAY] تمرير حمولة مشفرة من: ${data.sender}`);
    socket.broadcast.emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log(`[-] انقطع اتصال المستخدم: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🛡️ خادم Lianix Zino التكتيكي يعمل على المنفذ ${PORT}`);
});
