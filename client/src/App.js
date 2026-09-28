import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import CryptoJS from 'crypto-js';

const socket = io('https://lianix-zino.onrender.com');

export default function App() {
  const [myUsername, setMyUsername] = useState('إسماعيل');
  const [secretKey, setSecretKey] = useState('ZINO-TACTICAL-KEY-2026');

  // قائمة جهات الاتصال (نظام الواتساب التكتيكي)
  const [contacts, setContacts] = useState([
    { id: '1', name: 'أنس', status: 'ONLINE', avatar: 'AN', room: 'room_anas' },
    { id: '2', name: 'أشرف', status: 'ONLINE', avatar: 'AS', room: 'room_ashraf' },
    { id: '3', name: 'المحطة المركزية HQ', status: 'ACTIVE', avatar: 'HQ', room: 'room_hq' },
  ]);

  const [activeContact, setActiveContact] = useState(contacts[0]);
  const [newContactName, setNewContactName] = useState('');

  // سجل المحادثات المستقل لكل صديق
  const [conversations, setConversations] = useState({
    room_anas: [{ sender: 'أنس', text: 'تم استلام الإشارة المشفرة بنجاح.', time: '10:00 AM' }],
    room_ashraf: [{ sender: 'أشرف', text: 'جاهز للمحادثة عبر القناة الآمنة.', time: '10:05 AM' }],
    room_hq: [{ sender: 'HQ', text: 'قناة الاتصال التكتيكية المشفرة مفعلة.', time: '09:30 AM' }]
  });

  const [message, setMessage] = useState('');
  const chatEndRef = useRef(null);

  // أصوات الرنين واللاسلكي التكتيكية
  const playTacticalSound = (type = 'send') => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'send') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'receive') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.frequency.setValueAtTime(1600, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }
    } catch (e) {}
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, activeContact]);

  useEffect(() => {
    socket.on('receive_message', (data) => {
      playTacticalSound('receive');
      try {
        const bytes = CryptoJS.AES.decrypt(data.encryptedPayload, secretKey);
        const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
        const targetRoom = data.room || activeContact.room;

        setConversations((prev) => ({
          ...prev,
          [targetRoom]: [
            ...(prev[targetRoom] || []),
            {
              sender: data.sender || 'RX',
              text: decryptedText || '⚠️ مفتاح التشفير غير مطابق',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]
        }));
      } catch (e) {}
    });

    return () => socket.off('receive_message');
  }, [secretKey, activeContact]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    playTacticalSound('send');

    const encrypted = CryptoJS.AES.encrypt(message, secretKey).toString();
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    socket.emit('send_message', {
      sender: myUsername,
      room: activeContact.room,
      encryptedPayload: encrypted
    });

    setConversations((prev) => ({
      ...prev,
      [activeContact.room]: [
        ...(prev[activeContact.room] || []),
        { sender: 'أنت', text: message, time: currentTime, isMe: true }
      ]
    }));

    setMessage('');
  };

  const handleAddContact = () => {
    if (!newContactName.trim()) return;
    playTacticalSound('beep');
    const newRoom = 'room_' + Date.now();
    const newC = {
      id: String(Date.now()),
      name: newContactName.trim(),
      status: 'ONLINE',
      avatar: newContactName.trim().substring(0, 2).toUpperCase(),
      room: newRoom
    };
    setContacts((prev) => [...prev, newC]);
    setConversations((prev) => ({ ...prev, [newRoom]: [] }));
    setActiveContact(newC);
    setNewContactName('');
  };

  const activeMessages = conversations[activeContact.room] || [];

  return (
    <div style={styles.pageBackground}>
      {/* جسم جهاز اللاسلكي التكتيكي الكامل */}
      <div style={styles.handsetBody}>
        {/* الهوائي العلوي */}
        <div style={styles.antenna}></div>
        <div style={styles.antennaTip}></div>

        {/* السماعة العلوية لللاسلكي */}
        <div style={styles.topSpeaker}>
          <div style={styles.speakerGrill}></div>
          <div style={styles.speakerGrill}></div>
          <div style={styles.speakerGrill}></div>
        </div>

        {/* هيدر اللوغو والتشفير في الجهاز */}
        <div style={styles.headerBar}>
          <div style={styles.logoGroup}>
            <svg style={styles.logoIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-5.45 9-12V7l-9-5z" stroke="#00f0ff" fill="#0f172a" />
              <path d="M12 8v8M8 12h8" stroke="#00ff88" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <div>
              <div style={styles.logoTitle}>LIANIX ZINO</div>
              <div style={styles.logoSub}>TACTICAL E2EE MESSENGER</div>
            </div>
          </div>
          <div style={styles.statusBadge}>
            <span style={styles.statusDot}></span>
            <span>SECURE / AES-256</span>
          </div>
        </div>

        {/* الشاشة اللاسلكية الرئيسية (مقسمة: قائمة واتساب + شات) */}
        <div style={styles.mainDeviceScreen}>
          {/* شريط الأصدقاء جانبيًا (WhatsApp Contacts List) */}
          <div style={styles.sidebarSection}>
            <div style={styles.sidebarTitle}>جهات الاتصال</div>
            <div style={styles.addContactBox}>
              <input
                type="text"
                placeholder="+ إضافة اسم..."
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                style={styles.addInput}
              />
              <button onClick={handleAddContact} style={styles.addBtn}>+</button>
            </div>
            <div style={styles.contactsScroll}>
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => { playTacticalSound('beep'); setActiveContact(contact); }}
                  style={{
                    ...styles.contactCard,
                    backgroundColor: activeContact.id === contact.id ? '#0284c7' : '#1e293b'
                  }}
                >
                  <div style={styles.avatar}>{contact.avatar}</div>
                  <div style={styles.contactInfo}>
                    <div style={styles.contactName}>{contact.name}</div>
                    <div style={styles.contactStatus}>● {contact.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* منطقة المحادثة المفتوحة */}
          <div style={styles.chatSection}>
            <div style={styles.activeHeader}>
              <span>المحادثة مع: <strong>{activeContact.name}</strong></span>
            </div>
            <div style={styles.messagesViewport}>
              {activeMessages.length === 0 ? (
                <div style={styles.emptyNotice}>القناة التكتيكية جاهزة للمراسلة...</div>
              ) : (
                activeMessages.map((msg, index) => (
                  <div
                    key={index}
                    style={{
                      ...styles.msgRow,
                      justifyContent: msg.isMe ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div
                      style={{
                        ...styles.msgBubble,
                        ...(msg.isMe ? styles.myBubble : styles.theirBubble)
                      }}
                    >
                      <div style={styles.msgSender}>{msg.sender}</div>
                      <div>{msg.text}</div>
                      <div style={styles.msgTime}>{msg.time}</div>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* حقل كتابة وتشفير الرسالة */}
            <form onSubmit={handleSendMessage} style={styles.inputRow}>
              <input
                type="text"
                placeholder={`اكتب رسالتك لـ ${activeContact.name}...`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={styles.screenInput}
              />
              <button type="submit" style={styles.sendBtn}>إرسال</button>
            </form>
          </div>
        </div>

        {/* لوحة التحكم بمفتاح التشفير المشترك */}
        <div style={styles.keyPanel}>
          <label style={styles.keyLabel}>مفتاح التشفير المشترك (SECRET KEY):</label>
          <input
            type="text"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            style={styles.keyInput}
          />
        </div>

        {/* الأزرار الفيزيائية لللاسلكي التكتيكي */}
        <div style={styles.keypadContainer}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((key) => (
            <button key={key} onClick={() => playTacticalSound('beep')} style={styles.numKey}>
              {key}
            </button>
          ))}
          <button onClick={() => playTacticalSound('beep')} style={styles.funcKey}>FN</button>
          <button onClick={() => playTacticalSound('beep')} style={styles.funcKey}>ALT</button>
          <button onClick={() => setMessage('')} style={styles.funcKey}>CLR</button>
        </div>
      </div>
    </div>
  );
}

/* تنسيقات اللاسلكي التكتيكي الشاملة */
const styles = {
  pageBackground: {
    backgroundColor: '#0a0e17',
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '15px',
    boxSizing: 'border-box',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  },
  handsetBody: {
    position: 'relative',
    width: '100%',
    maxWidth: '520px',
    backgroundColor: '#0f172a',
    borderRadius: '35px',
    border: '4px solid #1e293b',
    padding: '20px',
    boxShadow: '0 25px 50px -12px rgba(0, 240, 255, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  antenna: {
    position: 'absolute',
    top: '-35px',
    left: '60px',
    width: '14px',
    height: '40px',
    backgroundColor: '#0f172a',
    borderLeft: '2px solid #334155',
    borderRight: '2px solid #334155'
  },
  antennaTip: {
    position: 'absolute',
    top: '-42px',
    left: '58px',
    width: '18px',
    height: '8px',
    backgroundColor: '#00f0ff',
    borderRadius: '4px'
  },
  topSpeaker: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    width: '50px',
    margin: '0 auto 5px auto'
  },
  speakerGrill: {
    height: '3px',
    backgroundColor: '#334155',
    borderRadius: '2px'
  },
  headerBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#030712',
    padding: '10px 14px',
    borderRadius: '12px',
    border: '1px solid #1e293b'
  },
  logoGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  logoIcon: {
    width: '32px',
    height: '32px'
  },
  logoTitle: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#00f0ff',
    letterSpacing: '1.5px'
  },
  logoSub: {
    fontSize: '0.55rem',
    color: '#64748b',
    letterSpacing: '1px'
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    border: '1px solid #00ff88',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '0.65rem',
    color: '#00ff88'
  },
  statusDot: {
    width: '6px',
    height: '6px',
    backgroundColor: '#00ff88',
    borderRadius: '50%'
  },
  mainDeviceScreen: {
    display: 'flex',
    backgroundColor: '#030712',
    border: '2px solid #0284c7',
    borderRadius: '16px',
    height: '320px',
    overflow: 'hidden'
  },
  sidebarSection: {
    width: '140px',
    backgroundColor: '#0f172a',
    borderLeft: '1px solid #1e293b',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column'
  },
  sidebarTitle: {
    fontSize: '0.7rem',
    color: '#00f0ff',
    fontWeight: 'bold',
    marginBottom: '6px',
    textAlign: 'center'
  },
  addContactBox: {
    display: 'flex',
    gap: '4px',
    marginBottom: '8px'
  },
  addInput: {
    width: '100%',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    color: '#fff',
    padding: '4px 6px',
    borderRadius: '4px',
    fontSize: '0.65rem',
    outline: 'none'
  },
  addBtn: {
    backgroundColor: '#00f0ff',
    color: '#0f172a',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  contactsScroll: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  contactCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  avatar: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#0f172a',
    color: '#00f0ff',
    border: '1px solid #00f0ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.6rem',
    fontWeight: 'bold'
  },
  contactInfo: {
    overflow: 'hidden'
  },
  contactName: {
    fontSize: '0.7rem',
    fontWeight: 'bold',
    color: '#fff',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis'
  },
  contactStatus: {
    fontSize: '0.55rem',
    color: '#00ff88'
  },
  chatSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  activeHeader: {
    backgroundColor: '#0f172a',
    padding: '6px 10px',
    borderBottom: '1px solid #1e293b',
    fontSize: '0.75rem',
    color: '#38bdf8'
  },
  messagesViewport: {
    flex: 1,
    padding: '10px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  emptyNotice: {
    color: '#475569',
    fontSize: '0.7rem',
    textAlign: 'center',
    marginTop: 'auto',
    marginBottom: 'auto'
  },
  msgRow: {
    display: 'flex'
  },
  msgBubble: {
    maxWidth: '80%',
    padding: '6px 10px',
    borderRadius: '8px',
    fontSize: '0.75rem'
  },
  myBubble: {
    backgroundColor: '#0284c7',
    color: '#fff'
  },
  theirBubble: {
    backgroundColor: '#1e293b',
    color: '#f8fafc'
  },
  msgSender: {
    fontSize: '0.6rem',
    fontWeight: 'bold',
    opacity: 0.8
  },
  msgTime: {
    fontSize: '0.55rem',
    opacity: 0.6,
    marginTop: '2px'
  },
  inputRow: {
    display: 'flex',
    gap: '6px',
    padding: '8px',
    backgroundColor: '#0f172a',
    borderTop: '1px solid #1e293b'
  },
  screenInput: {
    flex: 1,
    backgroundColor: '#030712',
    border: '1px solid #334155',
    color: '#00f0ff',
    padding: '6px 10px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    outline: 'none'
  },
  sendBtn: {
    backgroundColor: '#00f0ff',
    color: '#0f172a',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  keyPanel: {
    backgroundColor: '#030712',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #1e293b'
  },
  keyLabel: {
    fontSize: '0.65rem',
    color: '#9ca3af',
    display: 'block',
    marginBottom: '4px'
  },
  keyInput: {
    width: '100%',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    color: '#00f0ff',
    padding: '6px 10px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontFamily: 'monospace',
    boxSizing: 'border-box'
  },
  keypadContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '6px',
    marginTop: '4px'
  },
  numKey: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    color: '#f8fafc',
    padding: '8px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  funcKey: {
    backgroundColor: '#334155',
    border: '1px solid #475569',
    color: '#00f0ff',
    padding: '8px',
    borderRadius: '6px',
    fontSize: '0.65rem',
    fontWeight: 'bold',
    cursor: 'pointer'
  }
};
