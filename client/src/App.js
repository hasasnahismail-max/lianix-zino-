import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import CryptoJS from 'crypto-js';

const socket = io({
  transports: ['polling', 'websocket'],
  autoConnect: true
});

const SYSTEM_AUTO_KEY = 'LIANIX_PREMIUM_E2E_KEY_2026';

// رسم دقيق لأيقونة التلفون المحمول الثمانيني (1980s Retro Brick Mobile Phone)
const RetroBrickPhoneLogo = () => (
  <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* جسم الهاتف المحمول الثمانيني */}
    <rect x="32" y="20" width="36" height="72" rx="6" fill="#0B0F19" stroke="#00F0FF" strokeWidth="2.5"/>
    {/* الهوائي العلوي (Antenna) */}
    <rect x="40" y="4" width="4" height="16" rx="1" fill="#0B0F19" stroke="#00F0FF" strokeWidth="1.5"/>
    {/* موجات الإشارة اللاسلكية */}
    <path d="M 32 8 Q 42 2 52 8" stroke="#00A884" strokeWidth="2" fill="none" strokeLinecap="round"/>
    {/* شاشة LED المضيئة */}
    <rect x="37" y="28" width="26" height="16" rx="3" fill="#020617" stroke="#00F0FF" strokeWidth="1.2"/>
    <text x="50" y="39" fill="#00F0FF" fontSize="5.5" fontWeight="900" textAnchor="middle" fontFamily="monospace" letterSpacing="0.5">LIANIX</text>
    {/* السماعة العلوية */}
    <line x1="42" y1="24" x2="58" y2="24" stroke="#00F0FF" strokeWidth="1.5" strokeLinecap="round"/>
    {/* أزرار المفاتيح (3x4) */}
    <rect x="37" y="48" width="6" height="4" rx="1" fill="#1E293B"/>
    <rect x="47" y="48" width="6" height="4" rx="1" fill="#1E293B"/>
    <rect x="57" y="48" width="6" height="4" rx="1" fill="#1E293B"/>

    <rect x="37" y="55" width="6" height="4" rx="1" fill="#1E293B"/>
    <rect x="47" y="55" width="6" height="4" rx="1" fill="#1E293B"/>
    <rect x="57" y="55" width="6" height="4" rx="1" fill="#1E293B"/>

    <rect x="37" y="62" width="6" height="4" rx="1" fill="#1E293B"/>
    <rect x="47" y="62" width="6" height="4" rx="1" fill="#1E293B"/>
    <rect x="57" y="62" width="6" height="4" rx="1" fill="#1E293B"/>

    <rect x="37" y="69" width="6" height="4" rx="1" fill="#1E293B"/>
    <rect x="47" y="69" width="6" height="4" rx="1" fill="#1E293B"/>
    <rect x="57" y="69" width="6" height="4" rx="1" fill="#1E293B"/>
    {/* أزرار العمليات الملونة */}
    <rect x="37" y="77" width="11" height="6" rx="1.5" fill="#00A884"/>
    <rect x="52" y="77" width="11" height="6" rx="1.5" fill="#2563EB"/>
    {/* المايكروفون */}
    <circle cx="50" cy="87" r="1.5" fill="#00F0FF"/>
  </svg>
);

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('lianix_phone_profile');
    return saved ? JSON.parse(saved) : null;
  });

  const [regPhone, setRegPhone] = useState('');
  const [contacts, setContacts] = useState(() => {
    const saved = localStorage.getItem('lianix_phone_contacts');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeChat, setActiveChat] = useState(null);
  const [view, setView] = useState('list');
  const [messages, setMessages] = useState({});
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isFriendTyping, setIsFriendTyping] = useState(false);

  const chatEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // إقحام حركة الشفاه النابضة للإيموجي المتكلم
  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.type = 'text/css';
    styleSheet.innerText = `
      @keyframes talkLipAnimation {
        0% { transform: scaleY(1) scaleX(1); }
        25% { transform: scaleY(1.35) scaleX(0.85) translateY(-2px); }
        50% { transform: scaleY(0.7) scaleX(1.1); }
        75% { transform: scaleY(1.4) scaleX(0.8) translateY(-3px); }
        100% { transform: scaleY(1) scaleX(1); }
      }
      .talking-lip-emoji {
        display: inline-block;
        animation: talkLipAnimation 0.3s infinite ease-in-out;
        transform-origin: center;
      }
    `;
    document.head.appendChild(styleSheet);
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('lianix_phone_profile', JSON.stringify(currentUser));
      socket.emit('register_user', currentUser);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('lianix_phone_contacts', JSON.stringify(contacts));
  }, [contacts]);

  // الربط المباشر برابط الهاتف الدعائي
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const invitePhone = queryParams.get('invitePhone');

    if (invitePhone && currentUser && invitePhone !== currentUser.phone) {
      const roomId = [currentUser.phone, invitePhone].sort().join('_ROOM_');
      const newContact = {
        id: roomId,
        phone: invitePhone,
        avatar: invitePhone.slice(-2),
        color: '#00A884',
        lastMsg: 'تم الربط عبر الرابط',
        time: 'الآن'
      };

      setContacts((prev) => {
        const exists = prev.find((c) => c.phone === invitePhone);
        if (exists) return prev;
        return [newContact, ...prev];
      });

      setActiveChat(newContact);
      setView('chat');
    }
  }, [currentUser]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChat, isFriendTyping]);

  useEffect(() => {
    if (activeChat) {
      socket.emit('join_chat_room', activeChat.id);
    }
  }, [activeChat]);

  useEffect(() => {
    if (socket.connected) setIsConnected(true);

    const onConnect = () => {
      setIsConnected(true);
      if (currentUser) socket.emit('register_user', currentUser);
    };
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    socket.on('user_typing', () => setIsFriendTyping(true));
    socket.on('user_stop_typing', () => setIsFriendTyping(false));

    socket.on('receive_private_message', (data) => {
      if (!data || !data.encryptedPayload) return;

      try {
        const bytes = CryptoJS.AES.decrypt(data.encryptedPayload, SYSTEM_AUTO_KEY);
        const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
        const isMe = data.senderPhone === currentUser?.phone;

        if (decryptedText) {
          const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const newMsg = {
            id: Date.now(),
            sender: isMe ? 'أنت' : data.senderPhone,
            isMe: isMe,
            text: decryptedText,
            mediaType: data.mediaType || 'text',
            time: nowTime
          };

          setMessages((prev) => ({
            ...prev,
            [data.roomId]: [...(prev[data.roomId] || []), newMsg]
          }));

          setContacts((prev) =>
            prev.map((c) =>
              c.id === data.roomId ? { ...c, lastMsg: decryptedText, time: nowTime } : c
            )
          );
        }
      } catch (e) {
        console.error(e);
      }
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('receive_private_message');
      socket.off('user_typing');
      socket.off('user_stop_typing');
    };
  }, [currentUser]);

  const handleRegister = (e) => {
    e.preventDefault();
    if (!regPhone.trim()) return;
    setCurrentUser({ phone: regPhone.trim() });
  };

  const handleInviteViaWhatsApp = () => {
    if (!currentUser) return;
    const baseUrl = window.location.origin + window.location.pathname;
    const inviteUrl = `${baseUrl}?invitePhone=${encodeURIComponent(currentUser.phone)}`;
    const whatsappText = `مرحباً! أضفتك على منصة ليانكس المشفرة. اضغط على الرابط للتحدث معي مباشرة:\n${inviteUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappText)}`, '_blank');
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (activeChat) socket.emit('typing', { roomId: activeChat.id });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (activeChat) socket.emit('stop_typing', { roomId: activeChat.id });
    }, 1200);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat || !currentUser) return;

    const encrypted = CryptoJS.AES.encrypt(inputText, SYSTEM_AUTO_KEY).toString();

    socket.emit('send_private_message', {
      roomId: activeChat.id,
      encryptedPayload: encrypted,
      senderPhone: currentUser.phone,
      mediaType: 'text'
    });

    socket.emit('stop_typing', { roomId: activeChat.id });
    setInputText('');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !activeChat || !currentUser) return;

    const fileType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : null;
    if (!fileType) return;

    const reader = new FileReader();
    reader.onload = () => {
      const encrypted = CryptoJS.AES.encrypt(reader.result, SYSTEM_AUTO_KEY).toString();
      socket.emit('send_private_message', {
        roomId: activeChat.id,
        encryptedPayload: encrypted,
        senderPhone: currentUser.phone,
        mediaType: fileType
      });
    };
    reader.readAsDataURL(file);
  };

  // شاشة التفعيل الفخمة
  if (!currentUser) {
    return (
      <div style={styles.appShell}>
        <div style={styles.setupCard}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
            <RetroBrickPhoneLogo />
          </div>
          <h1 style={styles.brandTitleText}>
            LIANIX <span style={{ fontSize: '13px', color: '#00F0FF', fontWeight: 'bold' }}>| ليانكس</span>
          </h1>
          <p style={{ fontSize: '12px', color: '#94A3B8', margin: '10px 0 24px 0', lineHeight: '1.5' }}>
            منصة الاتصال المشفرة بالهوية الثمانينية الفخمة. أدخل رقم هاتفك لبدء الاستخدام:
          </p>
          
          <form onSubmit={handleRegister}>
            <input 
              type="tel" 
              placeholder="رقم هاتفك (مثال: 059XXXXXXX)..." 
              value={regPhone} 
              onChange={(e) => setRegPhone(e.target.value)} 
              style={styles.setupInput} 
              required 
              autoFocus
            />
            <button type="submit" style={styles.setupBtn}>تفعيل وتصفح المنصة</button>
          </form>
        </div>
      </div>
    );
  }

  const currentMsgs = activeChat ? (messages[activeChat.id] || []) : [];

  return (
    <div style={styles.appShell}>
      {/* 1. قائمة المحادثات الرئيسية */}
      {view === 'list' ? (
        <div style={styles.mobileScreen}>
          <div style={styles.headerBar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <RetroBrickPhoneLogo />
              <div>
                <h1 style={styles.brandTitleText}>
                  LIANIX <span style={{ fontSize: '12px', color: '#00F0FF' }}>| ليانكس</span>
                </h1>
                <span style={{ fontSize: '10px', color: '#94A3B8' }}>رقمك: {currentUser.phone}</span>
              </div>
            </div>
            <span style={{ fontSize: '10px', color: isConnected ? '#10B981' : '#EF4444', fontWeight: 'bold' }}>
              {isConnected ? '🟢 متصل' : '🔴 غير متصل'}
            </span>
          </div>

          <div style={styles.inviteBanner} onClick={handleInviteViaWhatsApp}>
            <div>
              <span style={{ fontWeight: 'bold', color: '#FFF', fontSize: '13px' }}>📲 دعوة صديق للربط المباشر</span>
              <span style={{ fontSize: '10px', color: '#CBD5E1', display: 'block' }}>إرسال رابط الدعوة للتحدث فوراً</span>
            </div>
            <button style={styles.inviteBtn}>إرسال</button>
          </div>

          <div style={styles.sectionHeader}>المحادثات المربوطة ({contacts.length})</div>

          <div style={styles.listContainer}>
            {contacts.length === 0 ? (
              <div style={styles.emptyWelcome}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                  <RetroBrickPhoneLogo />
                </div>
                <p style={{ fontSize: '14px', color: '#F8FAFC', margin: 0, fontWeight: 'bold' }}>لا توجد محادثات نشطة</p>
                <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>اضغط على "دعوة صديق" في الأعلى لإرسال رابط المنصة والبدء فوراً.</p>
              </div>
            ) : (
              contacts.map((c) => (
                <div 
                  key={c.id} 
                  onClick={() => { setActiveChat(c); setView('chat'); }}
                  style={styles.contactCard}>
                  <div style={styles.avatarCircle}>
                    📱
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span style={{ fontWeight: 'bold', color: '#F8FAFC', fontSize: '15px' }}>{c.phone}</span>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>{c.time}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.lastMsg}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* 2. شاشة المحادثة المفتوحة */
        <div style={styles.mobileScreen}>
          <div style={styles.chatHeader}>
            <button onClick={() => setView('list')} style={styles.backArrow} title="رجوع">
              ➔
            </button>
            <div style={styles.avatarSmall}>
              📱
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', color: '#F8FAFC', fontSize: '15px' }}>{activeChat.phone}</div>
              <div style={{ fontSize: '10px', color: '#00F0FF' }}>محادثة ثمانينية مشفرة 🟢</div>
            </div>
          </div>

          <div style={styles.chatBox}>
            {currentMsgs.length === 0 ? (
              <div style={styles.emptyBox}>
                <p style={{ fontSize: '28px', margin: '0 0 5px 0' }}>🔐</p>
                <p style={{ fontSize: '13px', margin: 0, color: '#F8FAFC' }}>قناة مشفرة بالكامل مع {activeChat.phone}</p>
                <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>جميع الرسائل والميديا بينكما محمية بالكامل.</p>
              </div>
            ) : (
              currentMsgs.map((m) => (
                <div 
                  key={m.id} 
                  style={{
                    display: 'flex',
                    justifyContent: m.isMe ? 'flex-end' : 'flex-start',
                    marginBottom: '8px'
                  }}>
                  <div style={{
                    ...styles.msgBubble,
                    background: m.isMe ? '#005C4B' : '#1E293B',
                  }}>
                    {m.mediaType === 'text' && <span style={{ fontSize: '14px', color: '#F8FAFC' }}>{m.text}</span>}
                    {m.mediaType === 'image' && <img src={m.text} alt="صورة" style={styles.mediaImg} />}
                    {m.mediaType === 'video' && <video src={m.text} controls style={styles.mediaImg} />}
                    <span style={styles.msgTime}>{m.time} {m.isMe && <span style={{ color: '#00F0FF' }}>✓✓</span>}</span>
                  </div>
                </div>
              ))
            )}

            {/* الإيموجي المتكلم اللحظي عند كتابة الرسالة */}
            {isFriendTyping && (
              <div style={styles.talkingContainer}>
                <span className="talking-lip-emoji" style={{ fontSize: '20px' }}>🗣️</span>
                <span style={{ fontSize: '11px', color: '#00F0FF', fontWeight: 'bold' }}>
                  يتكلم ويكتب الآن... 💬
                </span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendMessage} style={styles.inputBar}>
            <label style={styles.attachBtn} title="إرفاق ميديا">
              📷
              <input type="file" accept="image/*,video/*" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
            <input 
              type="text" 
              placeholder="اكتب رسالة مشفرة..." 
              value={inputText}
              onChange={handleInputChange}
              style={styles.textInput}
            />
            <button type="submit" style={styles.sendBtn}>إرسال</button>
          </form>
        </div>
      )}
    </div>
  );
}

// التنسيقات الفخمة بلمسات النيون والألوان التكتيكية
const styles = {
  appShell: { width: '100vw', height: '100vh', background: '#0B0F19', fontFamily: 'system-ui, sans-serif', direction: 'rtl', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  setupCard: { background: '#0F172A', padding: '30px 24px', borderRadius: '24px', width: '310px', textAlign: 'center', border: '1px solid #00F0FF', boxShadow: '0 12px 40px rgba(0,240,255,0.18)' },
  brandTitleText: { margin: 0, fontSize: '21px', fontWeight: '900', color: '#F8FAFC', letterSpacing: '1px', textShadow: '0 0 10px rgba(0,240,255,0.3)' },
  setupInput: { width: '100%', padding: '12px', margin: '8px 0', borderRadius: '10px', border: '1px solid #334155', background: '#020617', color: '#FFF', fontSize: '13px', boxSizing: 'border-box', outline: 'none' },
  setupBtn: { width: '100%', padding: '12px', background: '#00A884', color: '#FFF', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginTop: '10px', boxShadow: '0 4px 15px rgba(0,168,132,0.3)' },
  mobileScreen: { width: '100%', maxWidth: '430px', height: '100%', display: 'flex', flexDirection: 'column', background: '#020617', position: 'relative' },
  headerBar: { padding: '14px 16px', background: '#0F172A', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1E293B' },
  inviteBanner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#005C4B', padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #1E293B' },
  inviteBtn: { padding: '6px 12px', background: '#00A884', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' },
  sectionHeader: { padding: '10px 16px', fontSize: '12px', fontWeight: 'bold', color: '#00F0FF', background: '#0B0F19' },
  listContainer: { flex: 1, overflowY: 'auto' },
  emptyWelcome: { textAlign: 'center', marginTop: '60px', padding: '20px' },
  contactCard: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid #1E293B', cursor: 'pointer' },
  avatarCircle: { width: '42px', height: '42px', borderRadius: '50%', background: '#1E293B', border: '1px solid #00F0FF', color: '#FFF', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '18px' },
  avatarSmall: { width: '36px', height: '36px', borderRadius: '50%', background: '#1E293B', border: '1px solid #00F0FF', color: '#FFF', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '15px' },
  chatHeader: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#0F172A', borderBottom: '1px solid #1E293B' },
  backArrow: { background: 'none', border: 'none', color: '#00F0FF', fontSize: '20px', cursor: 'pointer', padding: '0 4px' },
  chatBox: { flex: 1, overflowY: 'auto', padding: '12px', background: '#020617' },
  emptyBox: { textAlign: 'center', marginTop: '100px', background: '#0F172A', padding: '20px', borderRadius: '16px', border: '1px solid #1E293B' },
  msgBubble: { maxWidth: '78%', padding: '8px 12px', borderRadius: '12px', position: 'relative', boxS
