import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import CryptoJS from 'crypto-js';

// الاتصال بالسيرفر المحلي الموحد تلقائياً
const socket = io();

export default function App() {
  const [secretKey, setSecretKey] = useState('ZINO2026');
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);

  useEffect(() => {
    // استقبال الرسائل القادمة من الطرف الآخر
    socket.on('receive_message', (data) => {
      try {
        const bytes = CryptoJS.AES.decrypt(data.encryptedPayload, secretKey);
        const decryptedText = bytes.toString(CryptoJS.enc.Utf8);

        setChat((prev) => [
          ...prev,
          { 
            sender: 'صديقك', 
            text: decryptedText || '⚠️ مفتاح التشفير غير مطابق' 
          }
        ]);
      } catch (e) {
        setChat((prev) => [
          ...prev, 
          { sender: 'صديقك', text: '⚠️ مفتاح التشفير غير مطابق' }
        ]);
      }
    });

    return () => socket.off('receive_message');
  }, [secretKey]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    // 1. تشفير الرسالة وتحويلها إلى نص صريح (.toString)
    const encrypted = CryptoJS.AES.encrypt(message, secretKey).toString();

    // 2. إرسال الرسالة عبر السوكيت للطرف الآخر
    socket.emit('send_message', {
      sender: 'أنت',
      encryptedPayload: encrypted
    });

    // 3. إظهار الرسالة فوراً في شاشة المرسل
    setChat((prev) => [...prev, { sender: 'أنت', text: message }]);
    setMessage('');
  };

  return (
    <div style={{ maxWidth: '400px', margin: '20px auto', padding: '20px', fontFamily: 'sans-serif', textAlign: 'right', direction: 'rtl' }}>
      <h2>ليانكس</h2>
      <div style={{ marginBottom: '15px' }}>
        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>مفتاح التشفير (يجب أن يكون متطابقاً عند الطرفين):</label>
        <input 
          type="text" 
          value={secretKey} 
          onChange={(e) => setSecretKey(e.target.value)}
          style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ border: '1px solid #ccc', height: '300px', overflowY: 'scroll', padding: '10px', borderRadius: '8px', marginBottom: '15px', background: '#f9f9f9' }}>
        {chat.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center' }}>لا توجد رسائل بعد...</p>
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
