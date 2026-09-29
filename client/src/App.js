import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import CryptoJS from 'crypto-js';

const socket = io({
  transports: ['polling', 'websocket'],
  autoConnect: true
});

const SYSTEM_AUTO_KEY = 'LIANIX_PREMIUM_E2E_KEY_2026';

// رسم دقيق لأيقونة التلفون الأرضي الثمانيني (1980s Retro Phone)
const Retro80sPhoneLogo = () => (
  <svg width="46" height="46" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* قاعدة الهاتف الكلاسيكي */}
    <rect x="20" y="45" width="60" height="40" rx="10" fill="#0F172A" stroke="#00F0FF" strokeWidth="2.5"/>
    {/* القرص الدائري للأرقام */}
    <circle cx="50" cy="65" r="13" fill="#1E293B" stroke="#00A884" strokeWidth="2"/>
    <circle cx="50" cy="57" r="2.5" fill="#00F0FF"/>
    <circle cx="58" cy="65" r="2.5" fill="#00F0FF"/>
    <circle cx="50" cy="73" r="2.5" fill="#00F0FF"/>
    <circle cx="42" cy="65" r="2.5" fill="#00F0FF"/>
    {/* السماعة الثمانينية المرفوعة فوق الهيكل */}
    <path d="M 15 32 Q 50 12 85 32 Q 90 42 78 40 Q 60 28 40 28 Q 20 28 12 40 Q 2 42 15 32 Z" fill="#00A884" stroke="#00F0FF" strokeWidth="1.5"/>
    {/* السلك الحلزوني الأيقوني */}
    <path d="M 22 75 Q 14 84 22 88 Q 28 84 22 78" stroke="#00F0FF" strokeWidth="2.5" fill="none"/>
    {/* لمبة البيان الخضراء */}
    <circle cx="72" cy="52" r="3" fill="#10B981"/>
  </svg>
);

export default function App() {
  // هوية المستخدم عبر رقم الهاتف
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('lianix_phone_profile');
    return saved ? JSON.parse(saved) : null;
  });

  const [regPhone, setRegPhone] = useState('');

  // قائمة جهات الاتصال والمحادثات
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

  useEffect(() => {
    // إضافة كود أنيميشن حركة الشفاه للإيموجي المتكلم
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
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

  // الربط التلقائي عبر رابط الدعوة
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
    
    const whatsappText = `مرحباً! أضفتك على منصة ليانكس المشفرة. اضغط على الرابط للتحدث معي مباشرة عبر الهوية الثمانينية:\n${inviteUrl}`;
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

  // الشاشة الأولى: التفعيل السريع برقم الهاتف
  if (!currentUser) {
    return (
      <div style={styles.appShell}>
        <div style={styles.setupCard}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
            <Retro80sPhoneLogo />
          </div>
          <h2 style={styles.brandTitle}>
            LIANIX <span style={{ fontSize: '13px', color: '#00F0FF' }}>| ليانكس</span>
          </h2>
          <p style={{ fontSize: '12px', color: '#94A3B8', margin: '8px 0 22px 0' }}>منصة الاتصال المشفرة بالهوية الثمانينية الفخمة. أدخل رقم هاتفك لبدء التفعيل:</p>
          
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
      {/* ---------------- 1. شاشة المحادثات الرئيسية ---------------- */}
      {view === 'list' ? (
        <div style={styles.mobileScreen}>
          {/* هيدر ليانكس الفخم والمهيب */}
          <div style={styles.headerBar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Retro80sPhoneLogo />
              <div>
                <h1 style={styles.brandTitle}>
                  LIANIX <span style={{ fontSize: '12px', color: '#00F0FF' }}>| ليانكس</span>
                </h1>
                <span style={{ fontSize: '10px', color: '#94A3B8' }}>رقمك: {currentUser.phone}</span>
              </div>
            </div>
            <span style={{ fontSize: '10px', color: isConnected ? '#10B981' : '#EF4444', fontWeight: 'bold' }}>
              {isConnected ? '🟢 متصل' : '🔴 غير متصل'}
            </span>
          </div>

          {/* بنر الدعوة التلقائية عبر واتساب */}
          <div style={styles.inviteBanner} onClick={handleInviteViaWhatsApp}>
            <div>
              <span style={{ fontWeight: 'bold', color: '#FFF', fontSize: '13px' }}>📲 دعوة صديق للربط المباشر</span>
              <span style={{ fontSize: '10px', color: '#CBD5E1', display: 'block' }}>إرسال رابط الدعوة الثمانيني للتحدث فوراً</span>
            </div>
            <button style={styles.inviteBtn}>إرسال</button>
          </div>

          <div style={styles.sectionHeader}>المحادثات المربوطة ({contacts.length})</div>

          <div style={styles.listContainer}>
            {contacts.length === 0 ? (
              <div style={styles.emptyWelcome}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                  <Retro80sPhoneLogo />
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
                    📞
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
        /* ---------------- 2. شاشة المحادثة المفتوحة ---------------- */
        <div style={styles.mobileScreen}>
          {/* هيدر المحادثة الفخم */}
          <div style={styles.chatHeader}>
            <button onClick={() => setView('list')} style={styles.backArrow} title="رجوع">
              ➔
            </button>
            <div style={styles.avatarSmall}>
              📞
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

            {/* الإيموجي المتكلم اللحظي المبتكر عند كتابة الرسالة */}
            {isFriendTyping && (
              <div style={styles.talkingContainer}>
                <span className="talking-lip-emoji">🗣️</span>
                <span style={{ fontSize: '11px', color: '#00F0FF', fontWeight: 'bold' }}>
                  يتكلم ويكتب الآن... 💬
                </span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendMessage} style={styles.inputBar}>
            <label style={styles.attachBtn} title="إرفاق ميديا مشفرة">
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
  setupCard: { background: '#0F172A', padding: '28px', borderRadius: '24px', width: '320px', textAlign: 'center', border: '1px solid #00F0FF', boxShadow: '0 12px 40px rgba(0,240,255,0.15)' },
  brandTitle: { margin: 0, fontSize: '20px', fontWeight: '900', color: '#F8FAFC', letterSpacing: '1px' },
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
  msgBubble: { maxWidth: '78%', padding: '8px 12px', borderRadius: '12px', position: 'relative', boxShadow: '0 2px 8px rgba(0,0,0,0.4)', border: '1px solid #334155' },
  mediaImg: { maxWidth: '100%', borderRadius: '8px', maxHeight: '200px', marginTop: '4px' },
  msgTime: { fontSize: '9px', color: '#94A3B8', display: 'block', textAlign: 'left', marginTop: '3px' },
  talkingContainer: { display: 'flex', alignItems: 'center', gap: '8px', background: '#0F172A', padding: '6px 12px', borderRadius: '20px', width: 'fit-content', border: '1px solid #00F0FF', margin: '8px 0' },
  inputBar: { display: 'flex', gap: '8px', padding: '10px 12px', background: '#0F172A', alignItems: 'center', borderTop: '1px solid #1E293B' },
  attachBtn: { background: '#1E293B', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', border: '1px solid #334155' },
  textInput: { flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155', background: '#020617', color: '#F8FA
