import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import CryptoJS from 'crypto-js';

const socket = io('http://localhost:5000');

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
            text: decryptedText || '⚠️ تعذر فك التشفير (المفتاح غير مطابق)',
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

    const encrypted = CryptoJS.AES.encrypt(message, secretKey).toString();

    socket.emit('send_message', {
      sender: 'المستخدم التكتيكي',
      encryptedPayload: encrypted,
    });

    setChat((prev) => [
      ...prev,
      { sender: 'أنت', text: message, raw: encrypted },
    ]);

    setMessage('');
  };

  return (
    <div style={{ backgroundColor: '#0f172a', color: '#E0F2FE', minHeight: '100vh', padding: '20px', fontFamily: 'monospace' }}>
      <header style={{ borderBottom: '1px solid #0284c7', paddingBottom: '15px', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, color: '#E0F2FE' }}>🛡️ LIANIX ZINO - E2EE Tactical Console</h1>
        <p style={{ fontSize: '12px', color: '#38bdf8', marginTop: '5px' }}>نظام المراسلة المشفر طرفاً لطرف (AES-256)</p>
        
        <div style={{ marginTop: '15px' }}>
          <label style={{ fontSize: '13px', marginRight: '10px' }}>مفتاح التشفير المحلي: </label>
          <input
            type="text"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            style={{ backgroundColor: '#1e293b', color: '#E0F2FE', border: '1px solid #0284c7', padding: '6px 10px', borderRadius: '4px', width: '260px' }}
          />
        </div>
      </header>

      <div style={{ border: '1px solid #1e293b', borderRadius: '8px', padding: '15px', height: '380px', overflowY: 'auto', marginBottom: '20px', backgroundColor: '#020617' }}>
        {chat.length === 0 ? (
          <div style={{ color: '#64748b', textAlign: 'center', marginTop: '150px' }}>لا توجد رسائل تكتيكية بعد...</div>
        ) : (
          chat.map((msg, idx) => (
            <div key={idx} style={{ marginBottom: '15px', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }}>
              <strong style={{ color: '#38bdf8' }}>[{msg.sender}]:</strong> <span style={{ color: '#E0F2FE' }}>{msg.text}</span>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', wordBreak: 'break-all' }}>
                🔒 الحمولة المشفرة (Payload): {msg.raw}
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={sendMessage} style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          placeholder="اكتب رسالة مشفرة..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ flex: 1, backgroundColor: '#1e293b', color: '#E0F2FE', border: '1px solid #0284c7', padding: '12px', borderRadius: '4px' }}
        />
        <button
          type="submit"
          style={{ backgroundColor: '#0284c7', color: '#ffffff', border: 'none', padding: '12px 24px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          تشفير وإرسال 🔒
        </button>
      </form>
    </div>
  );
}

export default App;
