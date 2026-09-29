import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import CryptoJS from 'crypto-js';

const socket = io({
  transports: ['polling', 'websocket'],
  autoConnect: true
});

export default function App() {
  const [secretKey, setSecretKey] = useState('ZINO2026');
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    if (socket.connected) {
      setIsConnected(true);
    }

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // استقبال تأكيد السيرفر وعرض الرسالة للطرفين
    socket.on('receive_message', (data) => {
      try {
        const bytes = CryptoJS.AES.decrypt(data.encryptedPayload, secretKey);
        const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
        const textToShow = decryptedText || '⚠️ مفتاح التشفير غير مطابق';
        const isMe = data.senderId === socket.id;

        setChat((prev) => [
          ...prev,
          { sender: isMe ? 'أنت' : 'صديقك', text: textToShow }
        ]);

        if (!isMe && "Notification" in window && Notification.permission === "granted") {
          new Notification("رسالة جديدة من ليانكس 💬", {
            body: textToShow,
            dir: "rtl"
          });
        }
      } catch (e) {
        const isMe = data.senderId === socket.id;
        setChat((prev) => [
          ...prev,
          { sender: isMe ? 'أنت' : 'صديقك', text: '⚠️ مفتاح التشفير غير مطابق' }
        ]);
      }
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('receive_message');
    };
  }, [secretKey]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      const encrypted = CryptoJS.AES.encrypt(message, secretKey).toString();

      socket.emit('send_message', {
        encryptedPayload: encrypted
      });

      setMessage('');
    } catch (err) {
      alert('حدث خطأ أثناء الإرسال');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '20px auto', padding: '20px', fontFamily: 'sans-serif', textAlign: 'right', direction: 'rtl' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h2 style={{ margin: 0 }}>ليانكس</h2>
        <span style={{ 
          fontSize: '11px', 
          padding: '4px 8px', 
          borderRadius: '12px', 
          background: isConnected ? '#e6fffa' : '#ffebe9', 
          color: isConnected ? '#0e9f6e' : '#e53e3e', 
          fontWeight: 'bold' 
        }}>
          {isConnected ? '🟢 متصل بالسيرفر' : '🔴 غير متصل'}
        </span>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>مفتاح التشفير (يجب أن يكون متطابقاً عند الطرفين):</label>
        <input 
          type="text" 
          value={secretKey} 
          onChange={(e) => setSecretKey(e.target.value)}
          style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>

      <div style={{ border: '1px solid #ccc', height: '300px', overflowY: 'scroll', padding: '10px', borderRadius: '8px', marginBottom: '15px', background: '#f9f9f9' }}>
        {chat.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center', marginTop: '120px' }}>لا توجد رسائل بعد...</p>
        ) : (
          chat.map((item, index) => (
            <div key={index} style={{ marginBottom: '10px', textAlign: item.sender === 'أنت' ? 'left' : 'right' }}>
              <span style={{ fontSize: '11px', color: '#666', display: 'block' }}>{item.sender}</span>
              <span style={{ 
                display: 'inline-block', 
                padding: '8px 12px', 
                borderRadius: '12px', 
                background: item.sender === 'أنت' ? '#007bff' : '#e9ecef', 
                color: item.sender === 'أنت' ? '#fff' : '#000' 
              }}>
                {item.text}
              </span>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSend} style={{ display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          placeholder="اكتب رسالة هنا..." 
          value={message} 
          onChange={(e) => setMessage(e.target.value)}
          style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button type="submit" style={{ padding: '10px 20px', background: '#000', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>إرسال</button>
      </form>
    </div>
  );
          }
