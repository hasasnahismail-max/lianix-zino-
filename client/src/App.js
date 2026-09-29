import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import CryptoJS from 'crypto-js';

// الاتصال بالسيرفر
const socket = io();

export default function App() {
  const [secretKey, setSecretKey] = useState('ZINO2026');
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);

  useEffect(() => {
    // استقبال الرسالة المباشرة من الصديق
    socket.on('receive_message', (data) => {
      try {
        const bytes = CryptoJS.AES.decrypt(data.encryptedPayload, secretKey);
        const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
        setChat((prev) => [
          ...prev,
          { sender: 'صديقك', text: decryptedText || '⚠️ مفتاح التشفير غير مطابق' }
        ]);
      } catch (e) {
        setChat((prev) => [...prev, { sender: 'صديقك', text: '⚠️ خطأ في التشفير' }]);
      }
    });

    return () => socket.off('receive_message');
  }, [secretKey]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    // تشفير الرسالة بـ AES
    const encrypted = CryptoJS.AES.encrypt(message, secretKey).toString();

    // إرسال عبر Socket
    socket.emit('send_message', {
      sender: 'أنت',
      encryptedPayload: encrypted
    });

    // إضافة الرسالة لسجلك الشخصي
    setChat((prev) => [...prev, { sender: 'أنت', text: message }]);
    setMessage('');
  };

  return (
    <div style={styles.container}>
      {/* اسم التطبيق بعد التعديل */}
      <h2 style={styles.title}>ليانكس</h2>
      
      {/* إعداد مفتاح التشفير */}
      <div style={styles.box}>
        <label style={styles.label}>مفتاح التشفير (يجب أن يكون متطابقاً عند الطرفين):</label>
        <input
          type="text"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          style={styles.input}
        />
      </div>

      {/* صندوق عرض الرسائل */}
      <div style={styles.chatBox}>
        {chat.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center' }}>لا توجد رسائل بعد...</p>
        ) : (
          chat.map((msg, index) => (
            <div
              key={index}
              style={{
                ...styles.msg,
                alignSelf: msg.sender === 'أنت' ? 'flex-end' : 'flex-start',
                backgroundColor: msg.sender === 'أنت' ? '#007bff' : '#28a745'
              }}
            >
              <strong>{msg.sender}: </strong> {msg.text}
            </div>
          ))
        )}
      </div>

      {/* نموذج الإرسال */}
      <form onSubmit={handleSend} style={styles.form}>
        <input
          type="text"
          placeholder="اكتب رسالة هنا..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={styles.inputMsg}
        />
        <button type="submit" style={styles.btn}>إرسال</button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '500px',
    margin: '0 auto',
    fontFamily: 'sans-serif',
    backgroundColor: '#f4f6f8',
    minHeight: '100vh',
    boxSizing: 'border-box'
  },
  title: { textAlign: 'center', color: '#111', fontSize: '24px', fontWeight: 'bold' },
  box: { marginBottom: '15px' },
  label: { display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' },
  input: { width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' },
  chatBox: {
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '8px',
    height: '300px',
    overflowY: 'auto',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '15px'
  },
  msg: { color: '#fff', padding: '8px 12px', borderRadius: '15px', maxWidth: '80%', fontSize: '14px' },
  form: { display: 'flex', gap: '10px' },
  inputMsg: { flex: 1, padding: '12px', borderRadius: '5px', border: '1px solid #ccc' },
  btn: { padding: '12px 20px', backgroundColor: '#111', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold' }
};
