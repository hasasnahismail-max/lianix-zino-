import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import CryptoJS from 'crypto-js';

const socket = io({
  transports: ['polling', 'websocket'],
  autoConnect: true
});

// أيقونة شعار ليانكس التكتيكي
const LianixLogo = () => (
  <svg width="38" height="38" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="25" y="15" width="50" height="75" rx="10" fill="#0B0F19" stroke="#00F0FF" strokeWidth="2.5"/>
    <rect x="46" y="4" width="8" height="12" rx="2" fill="#0B0F19" stroke="#00F0FF" strokeWidth="2"/>
    <rect x="32" y="24" width="36" height="22" rx="5" fill="#020617" stroke="#38BDF8" strokeWidth="1.5"/>
    <text x="50" y="38" fill="#FFFFFF" fontSize="8.5" fontWeight="900" textAnchor="middle" fontFamily="monospace" letterSpacing="1">LIANIX</text>
    <circle cx="62" cy="28" r="2" fill="#10B981"/>
    <rect x="34" y="51" width="8" height="5" rx="1.5" fill="#1E293B"/>
    <rect x="46" y="51" width="8" height="5" rx="1.5" fill="#1E293B"/>
    <rect x="58" y="51" width="8" height="5" rx="1.5" fill="#1E293B"/>
    <rect x="34" y="59" width="8" height="5" rx="1.5" fill="#1E293B"/>
    <rect x="46" y="59" width="8" height="5" rx="1.5" fill="#1E293B"/>
    <rect x="58" y="59" width="8" height="5" rx="1.5" fill="#1E293B"/>
    <rect x="34" y="73" width="14" height="8" rx="2" fill="#2563EB"/>
    <rect x="52" y="73" width="14" height="8" rx="2" fill="#EF4444"/>
  </svg>
);

export default function App() {
  // قائمة الغرف الافتراضية المحفوظة
  const defaultRooms = [
    { id: 'MAIN_VAULT', name: '🔒 الخزنة الرئيسية', key: 'ZINO2026' },
    { id: 'PRIVATE_CHAT', name: '💬 دردشة خاصة', key: 'SECRET123' },
  ];

  const [roomsList, setRoomsList] = useState(() => {
    const saved = localStorage.getItem('lianix_rooms');
    return saved ? JSON.parse(saved) : defaultRooms;
  });

  const [activeRoom, setActiveRoom] = useState(roomsList[0]);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomKey, setNewRoomKey] = useState('');

  const [viewMode, setViewMode] = useState('chat'); // 'rooms' أو 'chat' للشاشات الصغيرة
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isFriendTyping, setIsFriendTyping] = useState(false);

  const chatEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // حفظ القائمة في تخزين الهاتف المحلي
  useEffect(() => {
    localStorage.setItem('lianix_rooms', JSON.stringify(roomsList));
  }, [roomsList]);

  // انضمام للغرفة المحددة عند تغييرها
  useEffect(() => {
    setChat([]); // تفريغ شاشة الشات السابقة
    socket.emit('join_room', activeRoom.id);
  }, [activeRoom.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat, isFriendTyping]);

  useEffect(() => {
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
        const bytes = CryptoJS.AES.decrypt(data.encryptedPayload, activeRoom.key);
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
            new Notification(`رسالة من ${activeRoom.name} 💬`, {
              body: data.mediaType === 'text' ? decryptedContent : '📷 وصلتك ميديا مشفرة',
              dir: "rtl"
            });
          }
        }
      } catch (e) {
        const isMe = data.senderId === socket.id;
        setChat((prev) => [
          ...prev,
          { sender: isMe ? 'أنت' : 'صديقك', content: '⚠️ مفتاح التشفير غير مطابق لهذه الغرفة', mediaType: 'text' }
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
  }, [activeRoom]);

  // إشعار الجانب الآخر بالكتابة
  const handleInputChange = (e) => {
    setMessage(e.target.value);
    socket.emit('typing', { room: activeRoom.id });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { room: activeRoom.id });
    }, 1200);
  };

  // إرسال النص
  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const encrypted = CryptoJS.AES.encrypt(message, activeRoom.key).toString();
    socket.emit('send_message', { room: activeRoom.id, encryptedPayload: encrypted, mediaType: 'text' });
    socket.emit('stop_typing', { room: activeRoom.id });
    setMessage('');
  };

  // إرسال الصور والفيديوهات
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
      const encrypted = CryptoJS.AES.encrypt(base64Data, activeRoom.key).toString();
      socket.emit('send_message', { room: activeRoom.id, encryptedPayload: encrypted, mediaType: fileType });
    };
    reader.readAsDataURL(file);
  };

  // إضافة غرفة جديدة للقائمة
  const handleAddRoom = (e) => {
    e.preventDefault();
    if (!newRoomName.trim() || !newRoomKey.trim()) return;

    const roomId = newRoomName.trim().toUpperCase().replace(/\s+/g, '_');
    const newRoomObj = {
      id: roomId,
      name: `📁 ${newRoomName}`,
      key: newRoomKey.trim()
    };

    setRoomsList((prev) => [...prev, newRoomObj]);
    setActiveRoom(newRoomObj);
    setNewRoomName('');
    setNewRoomKey('');
    setShowRoomModal(false);
    setViewMode('chat');
  };

  return (
    <div style={styles.container}>
      {/* هيدر التطبيق والرأس العلوي */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <LianixLogo />
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#F8FAFC' }}>LIANIX MESSENGER</h3>
            <span style={{ fontSize: '10px', color: isConnected ? '#10B981' : '#EF4444', fontWeight: 'bold' }}>
              {isConnected ? '🟢 SECURE CONNECTED' : '🔴 DISCONNECTED'}
            </span>
          </div>
        </div>

        {/* أزرار التبديل بين شاشة المحادثة وقائمة الغرف (مثل واتساب) */}
        <div style={{ display: 'flex', gap: '5px' }}>
          <button 
            onClick={() => setViewMode('rooms')} 
            style={{ ...styles.tabBtn, background: viewMode === 'rooms' ? '#2563EB' : '#1E293B' }}>
            📋 الغرف
          </button>
          <button 
            onClick={() => setViewMode('chat')} 
            style={{ ...styles.tabBtn, background: viewMode === 'chat' ? '#2563EB' : '#1E293B' }}>
            💬 الدردشة
          </button>
        </div>
      </div>

      {/* شاشة قائمة الغرف (WhatsApp Rooms List) */}
      {viewMode === 'rooms' ? (
        <div style={styles.roomsContainer}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, color: '#00F0FF', fontSize: '14px' }}>قائمة المحادثات والغرف:</h4>
            <button onClick={() => setShowRoomModal(true)} style={styles.addRoomBtn}>+ غرفة جديدة</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {roomsList.map((rm) => (
              <div 
                key={rm.id} 
                onClick={() => { setActiveRoom(rm); setViewMode('chat'); }}
                style={{
                  ...styles.roomCard,
                  border: activeRoom.id === rm.id ? '1px solid #00F0FF' : '1px solid #1E293B',
                  background: activeRoom.id === rm.id ? '#1E293B' : '#0F172A'
                }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#F8FAFC' }}>{rm.name}</div>
                  <div style={{ fontSize: '10px', color: '#64748B' }}>ID: {rm.id}</div>
                </div>
                {activeRoom.id === rm.id && <span style={{ fontSize: '10px', color: '#10B981', fontWeight: 'bold' }}>نشط الآن 🟢</span>}
              </div>
            ))}
          </div>

          {/* نافذة إنشاء غرفة جديدة */}
          {showRoomModal && (
            <div style={styles.modalOverlay}>
              <form onSubmit={handleAddRoom} style={styles.modalContent}>
                <h4 style={{ margin: '0 0 10px 0', color: '#00F0FF' }}>إضافة غرفة/محادثة جديدة</h4>
                <input 
                  type="text" 
                  placeholder="اسم الغرفة (مثال: محادثة عمل)" 
                  value={newRoomName} 
                  onChange={(e) => setNewRoomName(e.target.value)} 
                  style={styles.inputModal} 
                  required 
                />
                <input 
                  type="text" 
                  placeholder="مفتاح التشفير الخاص بهذه الغرفة" 
                  value={newRoomKey} 
                  onChange={(e) => setNewRoomKey(e.target.value)} 
                  style={styles.inputModal} 
                  required 
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button type="submit" style={styles.saveBtn}>حفظ وإنشاء</button>
                  <button type="button" onClick={() => setShowRoomModal(false)} style={styles.cancelBtn}>إلغاء</button>
                </div>
              </form>
            </div>
          )}
        </div>
      ) : (
        /* شاشة الدردشة الحالية */
        <div>
          {/* بار الغرفة الحالية */}
          <div style={styles.activeRoomBar}>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#F8FAFC' }}>{activeRoom.name}</span>
              <span style={{ fontSize: '10px', color: '#00F0FF', display: 'block' }}>مفتاح الخزنة: {activeRoom.key}</span>
            </div>
            <button onClick={() => setViewMode('rooms')} style={{ fontSize: '11px', color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}>
              تغيير 🔄
            </button>
          </div>

          {/* صندوق المحادثة */}
          <div style={styles.chatBox}>
            {chat.length === 0 ? (
              <div style={{ textAlign: 'center', marginTop: '90px', color: '#64748B' }}>
                <p style={{ fontSize: '24px', margin: '0 0 5px 0' }}>🔐</p>
                <p style={{ fontSize: '12px', margin: 0 }}>مرحباً بك في {activeRoom.name}. القناة مشفرة بالكامل...</p>
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

            {/* الإيموجي الفكاهي الناطق */}
            {isFriendTyping && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '10px 0', background: '#0F172A', padding: '6px 12px', borderRadius: '20px', width: 'fit-content', border: '1px solid #00F0FF' }}>
                <span className="talking-emoji" style={{ fontSize: '20px' }}>🗣️</span>
                <span style={{ fontSize: '11px', color: '#00F0FF', fontWeight: 'bold' }}>
                  صديقك يتكلم الآن... 💬
                </span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* نموذج إدخال الرسالة */}
          <form onSubmit={handleSend} style={styles.form}>
            <label style={styles.attachBtn} title="إرسال صورة أو فيديو">
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
      )}
    </div>
  );
}

// التنسيقات العصرية الهادئة والمظلمة
const styles = {
  container: { maxWidth: '420px', margin: '15px auto', padding: '16px', fontFamily: 'system-ui, sans-serif', direction: 'rtl', background: '#0B0F19', borderRadius: '24px', boxShadow: '0 12px 40px rgba(0,240,255,0.12)', border: '1px solid #1E293B' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #1E293B' },
  tabBtn: { padding: '6px 10px', borderRadius: '8px', border: 'none', color: '#FFF', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' },
  roomsContainer: { padding: '10px 0', minHeight: '400px' },
  roomCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: '12px', cursor: 'pointer', transition: '0.2s' },
  addRoomBtn: { padding: '6px 12px', background: '#10B981', color: '#FFF', border: 'none', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' },
  activeRoomBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0F172A', padding: '8px 12px', borderRadius: '10px', border: '1px solid #1E293B', marginBottom: '10px' },
  chatBox: { border: '1px solid #1E293B', height: '330px', overflowY: 'auto', padding: '12px', borderRadius: '16px', background: '#020617', marginBottom: '12px' },
  form: { display: 'flex', gap: '8px', alignItems: 'center' },
  attachBtn: { background: '#1E293B', border: '1px solid #334155', padding: '10px 14px', borderRadius: '10px', cursor: 'pointer', fontSize: '16px', color: '#FFF' },
  inputMain: { flex: 1, padding: '12px 14px', borderRadius: '10px', border: '1px solid #334155', background: '#0F172A', color: '#F8FAFC', outline: 'none', fontSize: '13px' },
  sendBtn: { padding: '12px 20px', background: '#2563EB', color: '#FFF', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  modalContent: { background: '#0F172A', padding: '20px', borderRadius: '16px', width: '280px', border: '1px solid #00F0FF' },
  inputModal: { width: '100%', padding: '10px', margin: '6px 0', borderRadius: '8px', border: '1px solid #334155', background: '#020617', color: '#FFF', fontSize: '12px', boxSizing: 'border-box' },
  saveBtn: { flex: 1, padding: '8px', background: '#2563EB', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  cancelBtn: { flex: 1, padding: '8px', background: '#EF4444', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }
};
