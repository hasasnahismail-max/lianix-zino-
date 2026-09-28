import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import CryptoJS from 'crypto-js';

// ضع رابط سيرفر Render الخاص بك هنا بين علامتي التنصيص بدلاً من النص الموجود
const socket = io('ضع_رابط_سيرفر_الريندر_هنا');

function App() {
  const [secretKey, setSecretKey] = useState('ZINO-TACTICAL-KEY-2026');
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);

  useEffect(() => {
    socket.on('receive_message', (data) => {
      try {
        const bytes = CryptoJS.AES.decrypt(data.encryptedPayload, secretKey);
        const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
        setChat((prev) => [
          ...prev,
          {
            sender: data.sender,
            text: decryptedText || '⚠️ تعذر فك الشفرة (المفتاح غير مطابق)',
            raw: data.encryptedPayload,
          },
        ]);
      } catch (e) {
        setChat((prev) => [
          ...prev,
          { sender: data.sender, text: '⚠️ خطأ في معالجة الشفرة', raw: data.encryptedPayload },
        ]);
      }
    });

    return () => socket.off('receive_message');
  }, [secretKey]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    // تشفير الرسالة بنظام AES-256 قبل إرسالها للسيرفر
    const encrypted = CryptoJS.AES.encrypt(message, secretKey).toString();

    socket.emit('send_message', {
      sender: 'المستخدم التكتيكي',
      encryptedPayload: encrypted,
    });

    setChat((prev) => [
      ...prev,
      { sender: 'أنا', text: message, raw: encrypted },
    ]);

    setMessage('');
  };

  return (
    <div style={{ backgroundColor: '#0f172a', color: '#f0f2fe', minHeight: '100vh', padding: '20px', fontFamily: 'monospace' }}>
      <header style={{ borderBottom: '1px solid #0284c7', paddingBottom: '10px', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, color: '#f0f2fe', fontSize: '24px' }}>LIANIX ZINO - E2EE Tactical Messenger</h1>
        <p style={{ margin: '5px 0 0', color: '#94a3b8', fontSize: '14px' }}>منصة المحادثات التكتيكية المشفرة كلياً</p>
      </header>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', color: '#38bdf8' }}>مفتاح التشفير المشترك (Secret Key):</label>
        <input
          type="text"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          style={{ width: '100%', padding: '10px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '4px', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ border: '1px solid #334155', borderRadius: '4px', height: '350px', overflowY: 'scroll', padding: '15px', marginBottom: '20px', backgroundColor: '#020617' }}>
        {chat.map((msg, index) => (
          <div key={index} style={{ marginBottom: '12px', borderBottom: '1px dashed #1e293b', paddingBottom: '8px' }}>
            <strong style={{ color: msg.sender === 'أنا' ? '#38bdf8' : '#f43f5e' }}>{msg.sender}: </strong>
            <span>{msg.text}</span>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px', wordBreak: 'break-all' }}>
              [Payload (Encrypted): {msg.raw}]
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder=" https://lianix-zino.onrender.com/"
          style={{ flex: 1, padding: '12px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }}
        />
        <button
          type="submit"
          style={{ padding: '12px 24px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          إرسال مشفر
        </button>
      </form>
    </div>
  );
}

export default App;
