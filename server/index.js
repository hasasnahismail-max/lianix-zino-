const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

const server = http.createServer(app);

// إعداد Socket.io مع تفعيل Polling و WebSocket
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['polling', 'websocket']
});

io.on('connection', (socket) => {
  console.log('مستخدم متصل:', socket.id);

  socket.on('send_message', (data) => {
    socket.broadcast.emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log('مستخدم غادر');
  });
});

// تقديم ملفات React المبنية (المسار الخارجي الصحيح)
app.use(express.static(path.join(__dirname, '../client/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'), (err) => {
    if (err) {
      res.send('Lianix Server is Running...');
    }
  });
});

// ربط السيرفر بجميع الواجهات الشبكية
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
