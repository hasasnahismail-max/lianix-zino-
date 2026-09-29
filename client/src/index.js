const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

const server = http.createServer(app);

// إعداد Socket.io وتفعيل CORS
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// إدارة الاتصالات والرسائل الفورية
io.on('connection', (socket) => {
  console.log('مستخدم متصل:', socket.id);

  // استقبال الرسالة وإعادة بثها للشخص الآخر
  socket.on('send_message', (data) => {
    socket.broadcast.emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log('مستخدم غادر الاتصال');
  });
});

// تشغيل الواجهة (React) من نفس السيرفر
app.use(express.static(path.join(__dirname, 'client/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'), (err) => {
    if (err) {
      res.send('Lianix Server is Running...');
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
