const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// نقطة الفحص الرئيسية للمشروع
app.get('/', (req, res) => {
  res.json({
    project: "LIANIX ZINO",
    status: "Active",
    mode: "Tactical E2EE Relay Node"
  });
});

// إدارة الاتصالات الفورية (Real-time Sockets)
io.on('connection', (socket) => {
  console.log(`[LIANIX ZINO] Tactical node connected: ${socket.id}`);

  // الانضمام لقناة تشفير خاصة
  socket.on('join_channel', (channelId) => {
    socket.join(channelId);
    console.log(`[LIANIX ZINO] Node ${socket.id} joined channel: ${channelId}`);
  });

  // إعادة توجيه الرسائل المشفرة لحظياً
  socket.on('send_message', (data) => {
    io.to(data.channelId).emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log(`[LIANIX ZINO] Node disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`[LIANIX ZINO] Core Server running on port ${PORT}`);
});
