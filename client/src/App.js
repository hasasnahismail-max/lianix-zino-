import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import CryptoJS from 'crypto-js';

const socket = io({
  transports: ['polling', 'websocket'],
  autoConnect: true
});

// شعار ليانكس التكتيكي
const LianixLogo = () => (
  <svg width="30" height="30" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="25" y="15" width="50" height="75" rx="10" fill="#0B0F19" stroke="#00F0FF" strokeWidth="2.5"/>
    <rect x="46" y="4" width="8" height="12" rx="2" fill="#0B0F19" stroke="#00F0FF" strokeWidth="2"/>
    <rect x="32" y="24" width="36" height="22" rx="5" fill="#020617" stroke="#38BDF8" strokeWidth="1.5"/>
    <text x="50" y="38" fill="#FFFFFF" fontSize="8.5" fontWeight="900" textAnchor="middle" fontFamily="monospace" letterSpacing="1">LIANIX</text>
    <circle cx="62" cy="28" r="2" fill="#10B981"/>
    <rect x="34" y="51" width="8" height="5" rx="1.5" fill="#1E293B"/>
    <rect x="46" y="51" width="8" height="5" rx="1.5" fill="#1E293B"/>
    <rect x="58" y="51" width="8" height="5" rx="1.5" fill="#1E293B"/>
  </svg>
);

export default function App() {
  // قائمة المحادثات والغرف الافتراضية
  const defaultRooms = [
    { id: 'MAIN_VAULT', name: 'الخزنة الرئيسية', key: 'ZINO2026', color: '#2563EB', lastMsg: 'القناة مشفرة بالكامل...', time: 'الآن' },
    { id: 'PRIVATE_CHAT', name: 'محادثة خاصة', key: 'SECRET123', color: '#059669', lastMsg: 'جاهز للاستلام', time: '18:45' },
  ];

  const [roomsList, setRoomsList] = useState(() => {
    const saved = localStorage.getItem('lianix_rooms');
    return saved ? JSON.parse(saved) : defaultRooms;
  });

  const [activeRoom, setActiveRoom] = useState(roomsList[0]);
  const [currentScreen, setCurrentScreen] = useState('list'); // 'list' أو 'chat' (أسلوب واتساب)
  const [showRoomModal, setShowRoomModal] = useState(false);
  
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomKey, setNewRoomKey] = useState('');

  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isFriendTyping, setIsFriendTyping] = useState(false);

  const chatEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // حفظ الغرف في تخزين الهاتف
  useEffect(() => {
    localStorage.setItem('lianix_rooms', JSON.stringify(roomsList));
  }, [roomsList]);

  // الاتصال بالغرفة المحددة
  useEffect(() => {
    setChat([]);
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
        50% { transform: scale(1.2) translateY(-2px); }
        100% { transform: scale(1) translateY(0); }
      }
      .talking-emoji { display: inline-block; animation: talkLip 0.35s infinite ease-in-out; }
    `;
    document.head.appendChild(styleSheet);

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
          const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          setChat((prev) => [
            ...prev,
            { 
              sender: isMe ? 'أنت' : 'صديقك', 
              content: decryptedContent, 
              mediaType: data.mediaType || 'text',
              time: nowStr
            }
          ]);

          // تحديث آخر رسالة في القائمة
          setRoomsList(prevRooms => prevRooms.map(r => {
            if (r.id === activeRoom.id) {
              return {
                ...r,
                lastMsg: data.mediaType === 'text' ? decryptedContent : '📷 صورة/فيديو',
                time: nowStr
              };
            }
            return r;
          }));
        }
      } catch (e) {
        const isMe = data.senderId === socket.id;
        setChat((prev) => [
          ...prev,
          { sender: isMe ? 'أنت' : 'صديقك', content: '⚠️ مفتاح التشفير غير مطابق', mediaType: 'text', time: '' }
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

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    socket.emit('typing', { room: activeRoom.id });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { room: activeRoom.id });
    }, 1200);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const encrypted = CryptoJS.AES.encrypt(message, activeRoom.key).toString();
    socket.emit('send_message', { room: activeRoom.id, encryptedPayload: encrypted, mediaType: 'text' });
    socket.emit('stop_typing', { room: activeRoom.id });
    setMessage('');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : null;
    if (!fileType) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result;
      const encrypted = CryptoJS.AES.encrypt(base64Data, activeRoom.key).toString();
      socket.emit('send_message', { room: activeRoom.id, encryptedPayload: encrypted, mediaType: fileType });
    };
    reader.readAsDataURL(file);
  };

  const handleAddRoom = (e) => {
    e.preventDefault();
    if (!newRoomName.trim() || !newRoomKey.trim()) return;

    const colors = ['#2563EB', '#059669', '#D97706', '#7C3AED', '#DB2777'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const roomId = newRoomName.trim().toUpperCase().replace(/\s+/g, '_');
    const newRoomObj = {
      id: roomId,
      name: newRoomName.trim(),
      key: newRoomKey.trim(),
      color: randomColor,
      lastMsg: 'تم إنشاء المحادثة',
      time: 'الآن'
    };

    setRoomsList((prev) => [newRoomObj, ...prev]);
    setActiveRoom(newRoomObj);
    setNewRoomName('');
    setNewRoomKey('');
    setShowRoomModal(false);
    setCurrentScreen('chat');
  };

  // استخراج أول حرفين للرمز الشخصي
  const getInitials = (name) => {
    if (!name) return 'LX';
    const words = name.trim().split(' ');
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div style={styles.container}>
      {/* ----------------1. شاشة قائمة المحادثات (WhatsApp Chat List) ---------------- */}
      {currentScreen === 'list' ? (
        <div style={styles.screenWrapper}>
          {/* هيدر القائمة الرئيسي */}
          <div style={styles.mainHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LianixLogo />
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#F8FAFC' }}>LIANIX</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '10px', color: isConnected ? '#10B981' : '#EF4444', fontWeight: 'bold' }}>
                {isConnected ? '🟢 متصل' : '🔴 غير متصل'}
              </span>
            </div>
          </div>

          {/* عنوان المحادثات */}
          <div style={styles.sectionTitle}>المحادثات والقنوات المشفرة</div>

          {/* عناصر القائمة */}
          <div style={styles.chatListScroll}>
            {roomsList.map((rm) => (
              <div 
                key={rm.id} 
                onClick={() => { setActiveRoom(rm); setCurrentScreen('chat'); }}
                style={styles.chatListItem}>
                
                {/* الدائرة الشخصية (Avatar) */}
                <div style={{ ...styles.avatar, background: rm.color }}>
                  {getInitials(rm.name)}
                </div>

                {/* تفاصيل المحادثة */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#F8FAFC' }}>{rm.name}</span>
                    <span style={{ fontSize: '10px', color: '#64748B' }}>{rm.time}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                    {rm.lastMsg}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* الزر العائم لإنشاء محادثة جديدة (FAB Button مثل واتساب) */}
          <button onClick={() => setShowRoomModal(true)} style={styles.fabBtn} title="إضافة محادثة">
            +
          </button>

          {/* نافذة إنشاء محادثة جديدة */}
          {showRoomModal && (
            <div style={styles.modalOverlay}>
              <form onSubmit={handleAddRoom} style={styles.modalContent}>
                <h4 style={{ margin: '0 0 12px 0', color: '#00F0FF', textAlign: 'center' }}>إضافة محادثة / شخص جديد</h4>
                <input 
                  type="text" 
                  placeholder="اسم الشخص أو الغرفة" 
                  value={newRoomName} 
                  onChange={(e) => setNewRoomName(e.target.value)} 
                  style={styles.inputModal} 
                  required 
                />
                <input 
                  type="text" 
                  placeholder="مفتاح التشفير الخاص بالمحادثة" 
                  value={newRoomKey} 
                  onChange={(e) => setNewRoomKey(e.target.value)} 
                  style={styles.inputModal} 
                  required 
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button type="submit" style={styles.saveBtn}>بدء المحادثة</button>
                  <button type="button" onClick={() => setShowRoomModal(false)} style={styles.cancelBtn}>إلغاء</button>
                </div>
              </form>
            </div>
          )}
        </div>
      ) : (
        /* ---------------- 2. شاشة المحادثة المفتوحة (WhatsApp Chat Screen) ---------------- */
        <div style={styles.screenWrapper}>
          {/* هيدر الدردشة العلوية مع سهم الرجوع والرمز الشخصي */}
          <div style={styles.chatHeader}>
            <button onClick={() => setCurrentScreen('list')} style={styles.backBtn} title="رجوع للقائمة">
              ➔
            </button>
            <div style={{ ...styles.avatarSmall, background: activeRoom.color }}>
              {getInitials(activeRoom.name)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#F8FAFC' }}>{activeRoom.name}</div>
              <div style={{ fontSize: '10px', color: '#00F0FF' }}>مفتاح الخزنة: {activeRoom.key}</div>
            </div>
          </div>

          {/* صندوق المحادثة والرسائل */}
          <div style={styles.chatBox}>
            {chat.length === 0 ? (
              <div style={{ textAlign: 'center', marginTop: '100px', color: '#64748B' }}>
                <p style={{ fontSize: '28px', margin: '0 0 5px 0' }}>🔐</p>
                <p style={{ fontSize: '12px', margin: 0 }}>محادثة مشفرة تماماً مع {activeRoom.name}</p>
              </div>
            ) : (
              chat.map((item, index) => (
                <div key={index} style={{ marginBottom: '10px', textAlign: item.sender === 'أنت' ? 'left' : 'right' }}>
                  <div style={{
                    display: 'inline-block',
                    padding: item.mediaType === 'text' ? '8px 12px' : '6px',
                    borderRadius: '12px',
                    background: item.sender === 'أنت' ? '#005C4B' : '#202C33', // ألوان واتساب الداكنة
                    color: '#E9EDEF',
                    maxWidth: '80%',
                    wordBreak: 'break-word',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                    position: 'relative'
                  }}>
                    {item.mediaType === 'text' && (
                      <span style={{ fontSize: '13px' }}>{item.content}</span>
                    )}
                    {item.mediaType === 'image' && (
                      <img src={item.content} alt="ميديا" style={{ width: '100%', borderRadius: '8px', maxHeight: '220px', objectFit: 'cover' }} />
                    )}
                    {item.mediaType === 'video' && (
                      <video src={item.content} controls style={{ width: '100%', borderRadius: '8px', maxHeight: '220px' }} />
                    )}
                    <span style={{ fontSize: '9px', color: '#8696A0', display: 'block', textAlign: 'left', marginTop: '3px' }}>
                      {item.time}
                    </span>
                  </div>
                </div>
              ))
            )}

            {/* مؤشر الكتابة */}
            {isFriendTyping && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '6px 0', background: '#111B21', padding: '4px 10px', borderRadius: '15px', width: 'fit-content', border: '1px solid #00F0FF' }}>
                <span className="talking-emoji" style={{ fontSize: '16px' }}>🗣️</span>
                <span style={{ fontSize: '10px', color: '#00F0FF', fontWeight: 'bold' }}>يكتب الآن...</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* شريط الإدخال المطور */}
          <form onSubmit={handleSend} style={styles.inputForm}>
            <label style={styles.attachBtn} title="إرفاق ميديا">
              📷
              <input type="file" accept="image/*,video/*" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
            <input 
              type="text" 
              placeholder="اكتب رسالة..." 
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

// التنسيقات المطابقة لتصميم واتساب المظلم التكتيكي
const styles = {
  container: { maxWidth: '410px', margin: '10px auto', height: '92vh', fontFamily: 'system-ui, sans-serif', direction: 'rtl', background: '#111B21', borderRadius: '20px', overflow: 'hidden', border: '1px solid #222D34', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
  screenWrapper: { display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' },
  mainHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#202C33', borderBottom: '1px solid #222D34' },
  sectionTitle: { padding: '10px 16px 4px 16px', fontSize: '12px', fontWeight: 'bold', color: '#00F0FF' },
  chatListScroll: { flex: 1, overflowY: 'auto', padding: '0 8px' },
  chatListItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderBottom: '1px solid #222D34', cursor: 'pointer', borderRadius: '10px', transition: '0.2s' },
  avatar: { width: '45px', height: '45px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#FFF', fontWeight: 'bold', fontSize: '16px' },
  avatarSmall: { width: '36px', height: '36px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#FFF', fontWeight: 'bold', fontSize: '13px' },
  fabBtn: { position: 'absolute', bottom: '20px', left: '20px', width: '50px', height: '50px', borderRadius: '50%', background: '#00A884', color: '#FFF', fontSize: '28px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  chatHeader: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#202C33', borderBottom: '1px solid #222D34' },
  backBtn: { background: 'none', border: 'none', color: '#00F0FF', fontSize: '18px', cursor: 'pointer', padding: '0 4px' },
  chatBox: { flex: 1, overflowY: 'auto', padding: '12px', background: '#0B141A' },
  inputForm: { display: 'flex', gap: '8px', padding: '10px 12px', background: '#202C33', alignItems: 'center' },
  attachBtn: { background: '#2A3942', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' },
  inputMain: { flex: 1, padding: '10px 14px', borderRadius: '8px', border: 'none', background: '#2A3942', color: '#E9EDEF', outline: 'none', fontSize: '13px' },
  sendBtn: { padding: '10px 16px', background: '#00A884', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  modalContent: { background: '#202C33', padding: '20px', borderRadius: '16px', width: '280px', border: '1px solid #00F0FF' },
  inputModal: { width: '100%', padding: '10px', margin: '6px 0', borderRadius: '8px', border: '1px solid #2A3942', background: '#111B21', color: '#FFF', fontSize: '12px', boxSizing: 'border-box' },
  saveBtn: { flex: 1, padding: '8px', background: '#00A884', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  cancelBtn: { flex: 1, padding: '8px', background: '#EF4444', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }
};
