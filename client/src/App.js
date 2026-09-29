import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import CryptoJS from 'crypto-js';

const socket = io({
  transports: ['polling', 'websocket'],
  autoConnect: true
});

// أيقونة شعار ليانكس (LIANIX Terminal) المقتبسة بدقة من الهوية البصرية
const LianixLogo = () => (
  <svg width="42" height="42" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="25" y="15" width="50" height="75" rx="10" fill="#0B0F19" stroke="#00F0FF" strokeWidth="2.5"/>
    <rect x="46" y="4" width="8" height="12" rx="2" fill="#0B0F19" stroke="#00F0FF" strokeWidth="2"/>
    <rect x="32" y="24" width="36" height="22" rx="5" fill="#020617" stroke="#38BDF8" strokeWidth="1.5"/>
    <text x="50" y="38" fill="#FFFFFF" fontSize="8.5" fontWeight="900" textAnchor="middle" fontFamily="monospace" letterSpacing="1">LIANIX</text>
    <circle cx="62" cy="28" r="2" fill="#10B981"/>
    {/* لوحة الأرقام */}
    <rect x="34" y="51" width="8" height="5" rx="1.5" fill="#1E293B"/>
    <rect x="46" y="51" width="8" height="5" rx="1.5" fill="#1E293B"/>
    <rect x="58" y="51" width="8" height="5" rx="1.5" fill="#1E293B"/>
    <rect x="34" y="59" width="8" height="5" rx="1.5" fill="#1E293B"/>
    <rect x="46" y="59" width="8" height="5" rx="1.5" fill="#1E293B"/>
    <rect x="58" y="59" width="8" height="5" rx="1.5" fill="#1E293B"/>
    {/* أزرار Connect & Vault */}
    <rect x="34" y="73" width="14" height="8" rx="2" fill="#2563EB"/>
    <rect x="52" y="73" width="14" height="8" rx="2" fill="#EF4444"/>
  </svg>
);

export default function App() {
  const [room, setRoom] = useState('MAIN_VAULT');
  const [secretKey, setSecretKey] = useState('ZINO2026');
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isFriendTyping, setIsFriendTyping] = useState(false);
  
  const chatEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // التمرير التلقائي لأسفل الشاشة
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    socket.emit('join_room', room);
  }, [room]);

  useEffect(() => {
    scrollToBottom();
  }, [chat, isFriendTyping]);

  useEffect(() => {
    // إقحام كود الحركة والأنيميشن للإيموجي الناطق
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = `
      @keyframes talkLip {
        0% { transform: scale(1) translateY(0); }
        50% { transform: scale(1.25) translateY(-2px); }
        100% { transform: scale(1) translateY(0); }
      }
      .talking-emoji {
        display: inline-block;
        animation: talkLip 0.35s infinite ease-in-out;
      }
    `;
    document.head.appendChild(styleSheet);

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    if (socket.connected) setIsConnected(true);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    socket.on('user_typing', () => setIsFriendTyping(true));
    socket.on('user_stop_typing', () => setIsFriendTyping(false));

    socket.on('receive_message', (data) => {
      if (!data || !data.encryptedPayload) return;

      try {
        const bytes = CryptoJS.AES.decrypt(data.encryptedPayload, secretKey);
        const decryptedContent = bytes.toString(CryptoJS.enc.Utf8);
        const isMe = data.senderId === socket.id;

        if (decryptedContent && decryptedContent.trim().length > 0) {
          setChat((prev) => [
            ...prev,
            { 
              sender: isMe ? 'أنت' : 'صديقك', 
              content: decryptedContent, 
              mediaType: data.mediaType || 'text' 
            }
          ]);

          if (!isMe && "Notification" in window && Notification.permission === "granted") {
            new Notification("رسالة جديدة من ليانكس 💬", {
              body: data.mediaType === 'text' ? decryptedContent : '📷 وصلتك ميديا مشفرة',
              dir: "rtl"
            });
          }
        }
      } catch (e) {
        const isMe = data.senderId === socket.id;
        setChat((prev) => [
          ...prev,
          { sender: isMe ? 'أنت' : 'صديقك', content: '⚠️ مفتاح التشفير غير مطابق', mediaType: 'text' }
        ]);
      }
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('receive_message');
      socket.off('user_typing');
      socket.off('user_stop_typing');
    };
  }, [secretKey]);

  // إرسال إشارة الكتابة
  const handleInputChange = (e) => {
    setMessage(e.target.value);
    socket.emit('typing', { room });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { room });
    }, 1200);
  };

  // إرسال النص
  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const encrypted = CryptoJS.AES.encrypt(message, secretKey).toString();
    socket.emit('send_message', { room, encryptedPayload: encrypted, mediaType: 'text' });
    socket.emit('stop_typing', { room });
    setMessage('');
  };

  // إرسال الصور والفيديوهات المشفرة
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : null;
    if (!fileType) {
      alert('يرجى اختيار صورة أو فيديو فقط');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result;
      const encrypted = CryptoJS.AES.encrypt(base64Data, secretKey).toString();
      socket.emit('send_message', { room, encryptedPayload: encrypted, mediaType: fileType });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={styles.container}>
      {/* هيدر الهوية التكتيكية ليانكس */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LianixLogo />
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#F8FAFC', letterSpacing: '0.5px' }}>
              LIANIX <span style={{ fontSize: '10px', color: '#00F0FF', border: '1px solid #00F0FF', padding: '1px 5px', borderRadius: '4px' }}>SECURE</span>
            </h3>
            <span style={{ fontSize: '11px', color: isConnected ? '#10B981' : '#EF4444', fontWeight: 'bold' }}>
              {isConnected ? '🟢 SECURE ACCESS CONNECTED' : '🔴 DISCONNECTED'}
            </span>
          </div>
        </div>
      </div>

      {/* لوحة التحكم بالغرفة ومفتاح الخزنة */}
      <div style={styles.settingsBox}>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>اسم الغرفة (ROOM):</label>
          <input 
            type="text" 
            value={room} 
            onChange={(e) => setRoom(e.target.value)} 
            style={styles.inputSmall} 
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>مفتاح الخزنة (KEY):</label>
          <input 
            type="text" 
            value={secretKey} 
            onChange={(e) => setSecretKey(e.target.value)} 
            style={styles.inputSmall} 
          />
        </div>
      </div>

      {/* شاشة الدردشة العسكرية المشفرة */}
      <div style={styles.chatBox}>
        {chat.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '100px', color: '#64748B' }}>
            <p style={{ fontSize: '24px', margin: '0 0 5px 0' }}>🔐</p>
            <p style={{ fontSize: '12px', margin: 0 }}>القناة مشفرة بالنظام التكتيكي (AES-256)...</p>
          </div>
        ) : (
          chat.map((item, index) => (
            <div key={index} style={{ marginBottom: '12px', textAlign: item.sender === 'أنت' ? 'left' : 'right' }}>
              <span style={{ fontSize: '10px', color: '#94A3B8', display: 'block', marginBottom: '3px' }}>{item.sender}</span>
              <div style={{
                display: 'inline-block',
                padding: item.mediaType === 'text' ? '10px 14px' : '6px',
                borderRadius: '14px',
                background: item.sender === 'أنت' ? '#2563EB' : '#1E293B',
                color: '#FFFFFF',
                border: item.sender === 'أنت' ? '1px solid #3B82F6' : '1px solid #334155',
                maxWidth: '85%',
                wordBreak: 'break-word',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}>
                {item.mediaType === 'text' && item.content}
                {item.mediaType === 'image' && (
                  <img src={item.content} alt="ميديا مشفرة" style={{ width: '100%', borderRadius: '10px', maxHeight: '250px', objectFit: 'cover' }} />
                )}
                {item.mediaType === 'video' && (
                  <video src={item.content} controls style={{ width: '100%', borderRadius: '10px', maxHeight: '250px' }} />
                )}
              </div>
            </div>
          ))
        )}

        {/* الإيموجي الفكاهي الناطق المباشر عند كتابة الرسالة */}
        {isFriendTyping && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '10px 0', background: '#0F172A', padding: '6px 12px', borderRadius: '20px', width: 'fit-content', border: '1px solid #00F0FF' }}>
            <span className="talking-emoji" style={{ fontSize: '20px' }}>🗣️</span>
            <span style={{ fontSize: '11px', color: '#00F0FF', fontWeight: 'bold' }}>
              صديقك يتكلم وينطق الآن... 💬
            </span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* حقل الإدخال وإرسال الميديا */}
      <form onSubmit={handleSend} style={styles.form}>
        <label style={styles.attachBtn} title="إرسال صورة أو فيديو مشفر">
          📷
          <input type="file" accept="image/*,video/*" onChange={handleFileUpload} style={{ display: 'none' }} />
        </label>
        <input 
          type="text" 
          placeholder="اكتب رسالة مشفرة..." 
          value={message} 
          onChange={handleInputChange} 
          style={styles.inputMain} 
        />
        <button type="submit" style={styles.sendBtn}>إرسال</button>
      </form>
    </div>
  );
}

// التنسيقات بالألوان السايبرية التكتيكية
const styles = {
  container: { maxWidth: '420px', margin: '15px auto', padding: '16px', fontFamily: 'Courier New, monospace, sans-serif', direction: 'rtl', background: '#0B0F19', borderRadius: '24px', boxShadow: '0 12px 40px rgba(0,240,255,0.15)', border: '1px solid #1E293B' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #1E293B' },
  settingsBox: { display: 'flex', gap: '10px', marginTop: '12px', marginBottom: '12px' },
  label: { fontSize: '10px', fontWeight: 'bold', color: '#00F0FF', display: 'block', marginBottom: '3px' },
  inputSmall: { width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #334155', background: '#0F172A', color: '#F8FAFC', fontSize: '11px', boxSizing: 'border-box', outline: 'none' },
  chatBox: { border: '1px solid #1E293B', height: '350px', overflowY: 'auto', padding: '12px', borderRadius: '16px', background: '#020617', marginBottom: '12px' },
  form: { display: 'flex', gap: '8px', alignItems: 'center' },
  attachBtn: { background: '#1E293B', border: '1px solid #334155', padding: '10px 14px', borderRadius: '10px', cursor: 'pointer', fontSize: '16px', color: '#FFF' },
  inputMain: { flex: 1, padding: '12px 14px', borderRadius: '10px', border: '1px solid #334155', background: '#0F172A', color: '#F8FAFC', outline: 'none', fontSize: '13px' },
  sendBtn: { padding: '12px 20px', background: '#2563EB', color: '#FFF', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 10px rgba(37,99,235,0.4)' }
};
