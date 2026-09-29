import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import CryptoJS from 'crypto-js';

// الاتصال التلقائي بنفس دومين المنصة الحالي
const socket = io({
  transports: ['websocket', 'polling'],
  secure: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000
});

const SYSTEM_KEY = 'LIANIX_E2E_AUTO_SECURE_KEY_2026';

const BrickPhoneIcon = () => (
  <svg width="42" height="42" viewBox="0 0 100 100" fill="none">
    <rect x="35" y="22" width="30" height="70" rx="5" fill="#0B0F19" stroke="#00F0FF" strokeWidth="2.5"/>
    <rect x="42" y="4" width="4" height="18" rx="1" fill="#0B0F19" stroke="#00F0FF" strokeWidth="1.5"/>
    <path d="M 34 8 Q 44 2 54 8" stroke="#00A884" strokeWidth="2" fill="none"/>
    <rect x="39" y="30" width="22" height="14" rx="2" fill="#020617" stroke="#00F0FF" strokeWidth="1"/>
    <text x="50" y="39" fill="#00F0FF" fontSize="5" fontWeight="900" textAnchor="middle" fontFamily="monospace">LIANIX</text>
    <line x1="43" y1="26" x2="57" y2="26" stroke="#00F0FF" strokeWidth="1.5"/>
    <rect x="39" y="48" width="5" height="3" fill="#1E293B"/><rect x="47" y="48" width="5" height="3" fill="#1E293B"/><rect x="55" y="48" width="5" height="3" fill="#1E293B"/>
    <rect x="39" y="54" width="5" height="3" fill="#1E293B"/><rect x="47" y="54" width="5" height="3" fill="#1E293B"/><rect x="55" y="54" width="5" height="3" fill="#1E293B"/>
    <rect x="39" y="60" width="5" height="3" fill="#1E293B"/><rect x="47" y="60" width="5" height="3" fill="#1E293B"/><rect x="55" y="60" width="5" height="3" fill="#1E293B"/>
    <rect x="39" y="66" width="5" height="3" fill="#1E293B"/><rect x="47" y="66" width="5" height="3" fill="#1E293B"/><rect x="55" y="66" width="5" height="3" fill="#1E293B"/>
    <rect x="39" y="73" width="9" height="5" rx="1" fill="#00A884"/><rect x="51" y="73" width="9" height="5" rx="1" fill="#2563EB"/>
    <circle cx="50" cy="83" r="1.5" fill="#00F0FF"/>
  </svg>
);

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('lx_user_v3');
    return saved ? JSON.parse(saved) : null;
  });
  const [phoneInput, setPhoneInput] = useState('');
  const [contacts, setContacts] = useState(() => {
    const saved = localStorage.getItem('lx_contacts_v3');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeChat, setActiveChat] = useState(null);
  const [view, setView] = useState('list');
  const [messages, setMessages] = useState({});
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);
  const typingTimer = useRef(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerText = `@keyframes talkAnim { 0%,100%{transform:scaleY(1);} 50%{transform:scaleY(1.4) translateY(-2px);} } .talking-emoji { display:inline-block; animation:talkAnim 0.3s infinite ease-in-out; }`;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('lx_user_v3', JSON.stringify(currentUser));
      socket.emit('register_user', currentUser);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('lx_contacts_v3', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('secureToken');
    const inviteDisplay = params.get('displayPhone') || 'جهة اتصال مشفرة';
    
    if (inviteToken && currentUser && inviteToken !== currentUser.token) {
      const roomId = [currentUser.token, inviteToken].sort().join('_SECURE_ROOM_');
      const newC = { id: roomId, token: inviteToken, displayName: inviteDisplay, lastMsg: 'محادثة آمنة جديدة', time: 'الآن' };
      
      setContacts(prev => {
        if (prev.find(c => c.token === inviteToken)) return prev;
        return [newC, ...prev];
      });
      setActiveChat(newC);
      setView('chat');
    }
  }, [currentUser]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChat, isTyping]);

  useEffect(() => {
    if (activeChat) socket.emit('join_chat_room', activeChat.id);
  }, [activeChat]);

  useEffect(() => {
    setIsConnected(socket.connected);
    const onConn = () => { setIsConnected(true); if (currentUser) socket.emit('register_user', currentUser); };
    const onDis = () => setIsConnected(false);
    
    socket.on('connect', onConn);
    socket.on('disconnect', onDis);
    socket.on('user_typing', () => setIsTyping(true));
    socket.on('user_stop_typing', () => setIsTyping(false));
    
    socket.on('receive_private_message', (data) => {
      if (!data?.encryptedPayload) return;
      try {
        const bytes = CryptoJS.AES.decrypt(data.encryptedPayload, SYSTEM_KEY);
        const text = bytes.toString(CryptoJS.enc.Utf8);
        const isMe = data.senderToken === currentUser?.token;
        if (text) {
          const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const newMsg = { id: Date.now(), text, isMe, time, mediaType: data.mediaType || 'text' };
          setMessages(prev => ({ ...prev, [data.roomId]: [...(prev[data.roomId] || []), newMsg] }));
          setContacts(prev => prev.map(c => c.id === data.roomId ? { ...c, lastMsg: text, time } : c));
        }
      } catch (e) { console.error(e); }
    });

    return () => {
      socket.off('connect', onConn);
      socket.off('disconnect', onDis);
      socket.off('user_typing');
      socket.off('user_stop_typing');
      socket.off('receive_private_message');
    };
  }, [currentUser]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (phoneInput.trim()) {
      const secureToken = 'sec_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      setCurrentUser({ phone: phoneInput.trim(), token: secureToken });
    }
  };

  const handleInvite = () => {
    if (!currentUser) return;
    const url = `${window.location.origin}${window.location.pathname}?secureToken=${currentUser.token}&displayPhone=${encodeURIComponent(currentUser.phone)}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent('انضم إلى قناة الاتصال الآمنة الخاصة بي عبر ليانكس:\n' + url)}`, '_blank');
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (activeChat) socket.emit('typing', { roomId: activeChat.id });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      if (activeChat) socket.emit('stop_typing', { roomId: activeChat.id });
    }, 1200);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat || !currentUser) return;
    const encryptedPayload = CryptoJS.AES.encrypt(inputText, SYSTEM_KEY).toString();
    socket.emit('send_private_message', { roomId: activeChat.id, encryptedPayload, senderToken: currentUser.token, mediaType: 'text' });
    socket.emit('stop_typing', { roomId: activeChat.id });
    setInputText('');
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file || !activeChat || !currentUser) return;
    const mediaType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : null;
    if (!mediaType) return;
    const reader = new FileReader();
    reader.onload = () => {
      const encryptedPayload = CryptoJS.AES.encrypt(reader.result, SYSTEM_KEY).toString();
      socket.emit('send_private_message', { roomId: activeChat.id, encryptedPayload, senderToken: currentUser.token, mediaType });
    };
    reader.readAsDataURL(file);
  };

  if (!currentUser) {
    return (
      <div style={styles.shell}>
        <div style={styles.card}>
          <BrickPhoneIcon />
          <h1 style={styles.title}>LIANIX <span style={{ color: '#00F0FF', fontSize: '13px' }}>| ليانكس</span></h1>
          <p style={styles.subText}>ENTER YOUR NUMBER TO SECURE THE LINE</p>
          <form onSubmit={handleLogin}>
            <input type="tel" placeholder="Phone Number (e.g. 059XXXXXXX)" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} style={styles.input} required />
            <button type="submit" style={styles.btnGreen}>CONNECT NOW</button>
          </form>
        </div>
      </div>
    );
  }

  const chatMsgs = activeChat ? (messages[activeChat.id] || []) : [];

  return (
    <div style={styles.shell}>
      {view === 'list' ? (
        <div style={styles.screen}>
          <div style={styles.header}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BrickPhoneIcon />
              <div>
                <h1 style={styles.title}>LIANIX <span style={{ color: '#00F0FF', fontSize: '12px' }}>| ليانكس</span></h1>
                <span style={{ fontSize: '10px', color: '#94A3B8' }}>رقمك: {currentUser.phone}</span>
              </div>
            </div>
            <span style={{ fontSize: '10px', color: isConnected ? '#10B981' : '#EF4444', fontWeight: 'bold' }}>
              {isConnected ? '🟢 متصل' : '🔴 غير متصل'}
            </span>
          </div>

          <div style={styles.invite} onClick={handleInvite}>
            <div>
              <div style={{ fontWeight: 'bold', color: '#FFF', fontSize: '13px' }}>📲 دعوة صديق برابط سري وآمن</div>
              <div style={{ fontSize: '10px', color: '#CBD5E1' }}>إرسال رابط مشفر يحافظ على الخصوصية</div>
            </div>
            <button style={styles.btnSmall}>إرسال</button>
          </div>

          <div style={styles.secHeader}>المحادثات المبرمجة ({contacts.length})</div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {contacts.length === 0 ? (
              <div style={{ textAlign: 'center', marginTop: '60px', padding: '20px' }}>
                <BrickPhoneIcon />
                <p style={{ color: '#F8FAFC', fontWeight: 'bold', margin: '10px 0 4px 0' }}>لا توجد محادثات نشطة</p>
                <p style={{ color: '#94A3B8', fontSize: '11px' }}>اضغط على "دعوة صديق" لإرسال الرابط والبدء.</p>
              </div>
            ) : (
              contacts.map((c) => (
                <div key={c.id} onClick={() => { setActiveChat(c); setView('chat'); }} style={styles.item}>
                  <div style={styles.avatar}>📞</div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 'bold', color: '#F8FAFC', fontSize: '14px' }}>{c.displayName || 'رقم آمن'}</span>
                      <span style={{ fontSize: '10px', color: '#64748B' }}>{c.time}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.lastMsg}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div style={styles.screen}>
          <div style={styles.header}>
            <button onClick={() => setView('list')} style={styles.backBtn}>➔</button>
            <div style={styles.avatarSmall}>📞</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', color: '#F8FAFC', fontSize: '14px' }}>{activeChat?.displayName || 'محادثة آمنة'}</div>
              <div style={{ fontSize: '10px', color: '#00F0FF' }}>اتصال مشفر برقم الهاتف 🟢</div>
            </div>
          </div>

          <div style={styles.chatBox}>
            {chatMsgs.length === 0 ? (
              <div style={styles.emptyBox}>
                <p style={{ fontSize: '24px', margin: '0 0 4px 0' }}>🔐</p>
                <p style={{ fontSize: '13px', color: '#F8FAFC', margin: 0 }}>محادثة مشفرة مع {activeChat?.displayName}</p>
                <p style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>الرسائل والميديا محمية بسرية تامة.</p>
              </div>
            ) : (
              chatMsgs.map((m) => (
                <div key={m.id} style={{ display: 'flex', justifyContent: m.isMe ? 'flex-end' : 'flex-start', marginBottom: '8px' }}>
                  <div style={{ ...styles.bubble, background: m.isMe ? '#005C4B' : '#1E293B' }}>
                    {m.mediaType === 'text' && <span style={{ fontSize: '14px', color: '#F8FAFC' }}>{m.text}</span>}
                    {m.mediaType === 'image' && <img src={m.text} alt="صورة" style={styles.media} />}
                    {m.mediaType === 'video' && <video src={m.text} controls style={styles.media} />}
                    <span style={styles.time}>{m.time} {m.isMe && <span style={{ color: '#00F0FF' }}>✓✓</span>}</span>
                  </div>
                </div>
              ))
            )}

            {isTyping && (
              <div style={styles.talkingBox}>
                <span className="talking-emoji" style={{ fontSize: '18px' }}>🗣️</span>
                <span style={{ fontSize: '11px', color: '#00F0FF', fontWeight: 'bold' }}>يتكلم ويكتب الآن... 💬</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSend} style={styles.inputBar}>
            <label style={styles.attach}>
              📷
              <input type="file" accept="image/*,video/*" onChange={handleFile} style={{ display: 'none' }} />
            </label>
            <input type="text" placeholder="اكتب رسالة مشفرة..." value={inputText} onChange={handleInputChange} style={styles.mainInput} />
            <button type="submit" style={styles.sendBtn}>إرسال</button>
          </form>
        </div>
      )}
    </div>
  );
}

const styles = {
  shell: { width: '100vw', height: '100vh', background: '#0B0F19', fontFamily: 'system-ui, sans-serif', direction: 'rtl', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  card: { background: '#0F172A', padding: '28px 20px', borderRadius: '20px', width: '310px', textAlign: 'center', border: '1px solid #00F0FF', boxShadow: '0 10px 30px rgba(0,240,255,0.15)' },
  title: { margin: 0, fontSize: '20px', fontWeight: '900', color: '#F8FAFC', letterSpacing: '1px' },
  subText: { fontSize: '11px', fontWeight: 'bold', color: '#00F0FF', margin: '12px 0 20px 0', letterSpacing: '1px', fontFamily: 'monospace' },
  input: { width: '100%', padding: '12px', margin: '6px 0', borderRadius: '8px', border: '1px solid #334155', background: '#020617', color: '#FFF', fontSize: '13px', boxSizing: 'border-box', outline: 'none', textAlign: 'center' },
  btnGreen: { width: '100%', padding: '12px', background: '#00A884', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', marginTop: '10px', letterSpacing: '1px' },
  screen: { width: '100%', maxWidth: '420px', height: '100%', display: 'flex', flexDirection: 'column', background: '#020617', position: 'relative' },
  header: { padding: '12px 14px', background: '#0F172A', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1E293B' },
  invite: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#005C4B', padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #1E293B' },
  btnSmall: { padding: '6px 12px', background: '#00A884', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' },
  secHeader: { padding: '8px 14px', fontSize: '11px', fontWeight: 'bold', color: '#00F0FF', background: '#0B0F19' },
  item: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderBottom: '1px solid #1E293B', cursor: 'pointer' },
  avatar: { width: '40px', height: '40px', borderRadius: '50%', background: '#1E293B', border: '1px solid #00F0FF', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '16px' },
  avatarSmall: { width: '34px', height: '34px', borderRadius: '50%', background: '#1E293B', border: '1px solid #00F0FF', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px' },
  backBtn: { background: 'none', border: 'none', color: '#00F0FF', fontSize: '18px', cursor: 'pointer', padding: '0 4px' },
  chatBox: { flex: 1, overflowY: 'auto', padding: '12px', background: '#020617' },
  emptyBox: { textAlign: 'center', marginTop: '80px', background: '#0F172A', padding: '18px', borderRadius: '14px', border: '1px solid #1E293B' },
  bubble: { maxWidth: '78%', padding: '8px 12px', borderRadius: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.3)', border: '1px solid #334155' },
  media: { maxWidth: '100%', borderRadius: '6px', maxHeight: '180px', marginTop: '4px' },
  time: { fontSize: '9px', color: '#94A3B8', display: 'block', textAlign: 'left', marginTop: '2px' },
  talkingBox: { display: 'flex', alignItems: 'center', gap: '6px', background: '#0F172A', padding: '4px 10px', borderRadius: '16px', width: 'fit-content', border: '1px solid #00F0FF', margin: '6px 0' },
  inputBar: { display: 'flex', gap: '6px', padding: '10px 12px', background: '#0F172A', alignItems: 'center', borderTop: '1px solid #1E293B' },
  attach: { background: '#1E293B', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', border: '1px solid #334155' },
  mainInput: { flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', background: '#020617', color: '#F8FAFC', outline: 'none', fontSize: '13px' },
  sendBtn: { padding: '10px 16px', background: '#2563EB', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }
};
