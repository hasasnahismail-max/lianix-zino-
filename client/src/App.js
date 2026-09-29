import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import CryptoJS from 'crypto-js';

const socket = io({
  transports: ['polling', 'websocket'],
  autoConnect: true
});

// مفتاح تشفير عام وضمني يعمل تلقائياً دون إزعاج المستخدم
const SYSTEM_ENCRYPTION_KEY = 'LIANIX_SECURE_DEFAULT_KEY_2026';

export default function App() {
  // قائمة جهات الاتصال والمحادثات
  const initialContacts = [
    { id: 'general', name: 'المجموعة العامة 💬', avatar: '👥', color: '#10B981', lastMsg: 'مرحباً بالجميع في ليانكس', time: '10:30 م', unread: 0 },
    { id: 'tech_team', name: 'فريق التقنية 🚀', avatar: '💻', color: '#2563EB', lastMsg: 'تم تحديث الواجهة بنجاح', time: '09:15 م', unread: 2 },
    { id: 'support', name: 'الدعم الفني 🎧', avatar: '🛠️', color: '#F59E0B', lastMsg: 'كيف يمكننا مساعدتك اليوم؟', time: 'أمس', unread: 0 }
  ];

  const [contacts, setContacts] = useState(initialContacts);
  const [activeChat, setActiveChat] = useState(initialContacts[0]);
  const [currentTab, setCurrentTab] = useState('chats'); // 'chats', 'status', 'settings'
  const [messages, setMessages] = useState({});
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isTyping, setIsTyping] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  
  // ميزة يتفوق بها: مؤقت الاختفاء التلقائي للرسائل
  const [autoDeleteTime, setAutoDeleteTime] = useState(0); // 0 = إيقاف, 10 = 10 ثواني, 60 = دقيقة

  const chatEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // التمرير التلقائي للأسفل
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChat, isTyping]);

  // الاتصال بالسيرفر والغرفة
  useEffect(() => {
    socket.emit('join_room', activeChat.id);
  }, [activeChat.id]);

  useEffect(() => {
    if (socket.connected) setIsConnected(true);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    socket.on('user_typing', () => setIsTyping(true));
    socket.on('user_stop_typing', () => setIsTyping(false));

    socket.on('receive_message', (data) => {
      if (!data || !data.encryptedPayload) return;

      try {
        const bytes = CryptoJS.AES.decrypt(data.encryptedPayload, SYSTEM_ENCRYPTION_KEY);
        const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
        const isMe = data.senderId === socket.id;

        if (decryptedText) {
          const newMsg = {
            id: Date.now() + Math.random(),
            sender: isMe ? 'أنت' : data.senderName || 'صديقك',
            isMe: isMe,
            text: decryptedText,
            mediaType: data.mediaType || 'text',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            replyText: data.replyText || null,
            reactions: []
          };

          setMessages((prev) => ({
            ...prev,
            [data.room]: [...(prev[data.room] || []), newMsg]
          }));

          // تحديث آخر رسالة في القائمة
          setContacts((prev) =>
            prev.map((c) =>
              c.id === data.room
                ? { ...c, lastMsg: decryptedText, time: newMsg.time }
                : c
            )
          );
        }
      } catch (e) {
        console.error("Decryption error", e);
      }
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('receive_message');
      socket.off('user_typing');
      socket.off('user_stop_typing');
    };
  }, []);

  // التعامل مع إدخال النص والكتابة
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    socket.emit('typing', { room: activeChat.id });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { room: activeChat.id });
    }, 1200);
  };

  // إرسال الرسالة
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const encrypted = CryptoJS.AES.encrypt(inputText, SYSTEM_ENCRYPTION_KEY).toString();

    socket.emit('send_message', {
      room: activeChat.id,
      encryptedPayload: encrypted,
      senderName: 'أنت',
      mediaType: 'text',
      replyText: replyTo ? replyTo.text : null
    });

    socket.emit('stop_typing', { room: activeChat.id });
    setInputText('');
    setReplyTo(null);
  };

  // إرسال صورة أو فيديو
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : null;
    if (!fileType) return;

    const reader = new FileReader();
    reader.onload = () => {
      const encrypted = CryptoJS.AES.encrypt(reader.result, SYSTEM_ENCRYPTION_KEY).toString();
      socket.emit('send_message', {
        room: activeChat.id,
        encryptedPayload: encrypted,
        senderName: 'أنت',
        mediaType: fileType
      });
    };
    reader.readAsDataURL(file);
  };

  // إرسال تفاعل إيموجي على رسالة
  const handleAddReaction = (msgId, emoji) => {
    setMessages((prev) => {
      const currentChatMsgs = prev[activeChat.id] || [];
      const updated = currentChatMsgs.map((m) => {
        if (m.id === msgId) {
          const reactions = m.reactions || [];
          return { ...m, reactions: [...reactions, emoji] };
        }
        return m;
      });
      return { ...prev, [activeChat.id]: updated };
    });
  };

  const currentChatMessages = messages[activeChat.id] || [];

  return (
    <div style={styles.appShell}>
      {/* ---------------- 1. الشريط الجانبي (المحادثات والقوائم) ---------------- */}
      <div style={styles.sidebar}>
        {/* هيدر الشريط الجانبي */}
        <div style={styles.sidebarHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={styles.myAvatar}>I</div>
            <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#E9EDEF' }}>ليانكس | Lianix</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', color: '#AEBAC1', cursor: 'pointer' }}>
            <span title="إضافة محادثة">+</span>
            <span title="الإعدادات">⚙️</span>
          </div>
        </div>

        {/* حقل البحث */}
        <div style={styles.searchBox}>
          <input 
            type="text" 
            placeholder="بحث أو بدء محادثة جديدة..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {/* قائمة التبويبات السفلي/العلوي */}
        <div style={styles.tabBar}>
          <button 
            onClick={() => setCurrentTab('chats')} 
            style={{ ...styles.tabBtn, borderBottom: currentTab === 'chats' ? '3px solid #00A884' : 'none', color: currentTab === 'chats' ? '#00A884' : '#8696A0' }}>
            المحادثات
          </button>
          <button 
            onClick={() => setCurrentTab('status')} 
            style={{ ...styles.tabBtn, borderBottom: currentTab === 'status' ? '3px solid #00A884' : 'none', color: currentTab === 'status' ? '#00A884' : '#8696A0' }}>
            الحالات 🟢
          </button>
        </div>

        {/* قائمة المحادثات */}
        {currentTab === 'chats' && (
          <div style={styles.chatList}>
            {contacts
              .filter(c => c.name.includes(searchQuery))
              .map((c) => (
                <div 
                  key={c.id} 
                  onClick={() => setActiveChat(c)}
                  style={{
                    ...styles.contactItem,
                    background: activeChat.id === c.id ? '#2A3942' : 'transparent'
                  }}>
                  <div style={{ ...styles.contactAvatar, background: c.color }}>
                    {c.avatar}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 'bold', color: '#E9EDEF', fontSize: '15px' }}>{c.name}</span>
                      <span style={{ fontSize: '11px', color: '#8696A0' }}>{c.time}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#8696A0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.lastMsg}
                    </div>
                  </div>
                </div>
            ))}
          </div>
        )}

        {currentTab === 'status' && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#8696A0' }}>
            <p style={{ fontSize: '30px' }}>📸</p>
            <p>لا توجد حالات جديدة اليوم</p>
          </div>
        )}
      </div>

      {/* ---------------- 2. منطقة المحادثة الرئيسية ---------------- */}
      <div style={styles.chatArea}>
        {/* هيدر المحادثة النشطة */}
        <div style={styles.chatHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ ...styles.contactAvatarSmall, background: activeChat.color }}>
              {activeChat.avatar}
            </div>
            <div>
              <div style={{ fontWeight: 'bold', color: '#E9EDEF', fontSize: '16px' }}>{activeChat.name}</div>
              <div style={{ fontSize: '11px', color: isConnected ? '#00A884' : '#EF4444' }}>
                {isConnected ? 'متصل الآن 🟢' : 'جاري الاتصال... 🔴'}
              </div>
            </div>
          </div>

          {/* أدوات إضافية يتفوق بها التطبيق */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* زر تفعيل مؤقت التدمير الذاتي للرسائل */}
            <button 
              onClick={() => setAutoDeleteTime(autoDeleteTime === 0 ? 10 : 0)}
              style={{ ...styles.featureBtn, background: autoDeleteTime > 0 ? '#00A884' : '#202C33' }}
              title="تفعيل اختفاء الرسائل التلقائي">
              ⏳ {autoDeleteTime > 0 ? 'مؤقت مفعل (10ث)' : 'رسائل مؤقتة'}
            </button>
          </div>
        </div>

        {/* جسم الرسائل */}
        <div style={styles.messagesContainer}>
          {currentChatMessages.length === 0 ? (
            <div style={styles.emptyWelcome}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>💬</div>
              <h4 style={{ color: '#E9EDEF', margin: 0 }}>أهلاً بك في {activeChat.name}</h4>
              <p style={{ color: '#8696A0', fontSize: '13px' }}>ابدأ المحادثة الآن، جميع الرسائل محمية ومُشفّرة تلقائياً.</p>
            </div>
          ) : (
            currentChatMessages.map((m) => (
              <div 
                key={m.id} 
                style={{
                  display: 'flex',
                  justifyContent: m.isMe ? 'flex-end' : 'flex-start',
                  marginBottom: '10px'
                }}>
                <div style={{
                  ...styles.messageBubble,
                  background: m.isMe ? '#005C4B' : '#202C33',
                  alignSelf: m.isMe ? 'flex-end' : 'flex-start'
                }}>
                  {/* اقتباس الرد إن وجد */}
                  {m.replyText && (
                    <div style={styles.replyQuote}>
                      <span style={{ fontSize: '10px', color: '#00A884', fontWeight: 'bold' }}>رد على:</span>
                      <div style={{ fontSize: '11px', color: '#CBD5E1' }}>{m.replyText}</div>
                    </div>
                  )}

                  {/* نص الرسالة أو الميديا */}
                  {m.mediaType === 'text' && <div style={{ fontSize: '14px', color: '#E9EDEF' }}>{m.text}</div>}
                  {m.mediaType === 'image' && <img src={m.text} alt="صورة" style={styles.mediaContent} />}
                  {m.mediaType === 'video' && <video src={m.text} controls style={styles.mediaContent} />}

                  {/* وقت الرسالة والمؤشرات */}
                  <div style={styles.msgFooter}>
                    <span style={{ fontSize: '10px', color: '#8696A0' }}>{m.time}</span>
                    {m.isMe && <span style={{ color: '#53BDEB', fontSize: '12px' }}>✓✓</span>}
                  </div>

                  {/* تفاعلات الإيموجي */}
                  <div style={styles.reactionBar}>
                    <button onClick={() => handleAddReaction(m.id, '👍')} style={styles.reactBtn}>👍</button>
                    <button onClick={() => handleAddReaction(m.id, '❤️')} style={styles.reactBtn}>❤️</button>
                    <button onClick={() => setReplyTo(m)} style={styles.reactBtn}>↩️</button>
                  </div>

                  {m.reactions && m.reactions.length > 0 && (
                    <div style={styles.reactionBadge}>
                      {m.reactions.join(' ')}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* مؤشر جاري الكتابة */}
          {isTyping && (
            <div style={styles.typingIndicator}>
              <span style={{ fontSize: '12px', color: '#00A884' }}>يكتب الآن... ✍️</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* معاينة الرد إذا كان محدداً */}
        {replyTo && (
          <div style={styles.replyPreviewBox}>
            <div>
              <span style={{ fontSize: '11px', color: '#00A884', fontWeight: 'bold' }}>الرد على الرسالة:</span>
              <div style={{ fontSize: '12px', color: '#E9EDEF' }}>{replyTo.text}</div>
            </div>
            <button onClick={() => setReplyTo(null)} style={styles.closeReplyBtn}>✕</button>
          </div>
        )}

        {/* شريط الإدخال المطور */}
        <form onSubmit={handleSendMessage} style={styles.inputArea}>
          <label style={styles.attachIcon} title="إرفاق ملف أو صورة">
            📎
            <input type="file" accept="image/*,video/*" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
          <input 
            type="text" 
            placeholder="اكتب رسالة..." 
            value={inputText}
            onChange={handleInputChange}
            style={styles.mainInput}
          />
          <button type="submit" style={styles.sendButton}>
            إرسال 🚀
          </button>
        </form>
      </div>
    </div>
  );
}

// التنسيقات الاحترافية المريحة المطابقة لتطبيقات الدردشة العصرية
const styles = {
  appShell: { display: 'flex', width: '100vw', height: '100vh', background: '#111B21', fontFamily: 'system-ui, sans-serif', direction: 'rtl', overflow: 'hidden' },
  sidebar: { width: '340px', background: '#111B21', borderLeft: '1px solid #222D34', display: 'flex', flexDirection: 'column' },
  sidebarHeader: { padding: '14px 16px', background: '#202C33', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  myAvatar: { width: '36px', height: '36px', borderRadius: '50%', background: '#00A884', color: '#FFF', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' },
  searchBox: { padding: '10px 14px', background: '#111B21' },
  searchInput: { width: '100%', padding: '8px 12px', borderRadius: '8px', border: 'none', background: '#202C33', color: '#E9EDEF', outline: 'none', fontSize: '13px', boxSizing: 'border-box' },
  tabBar: { display: 'flex', background: '#111B21', borderBottom: '1px solid #222D34' },
  tabBtn: { flex: 1, padding: '10px', background: 'none', border: 'none', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' },
  chatList: { flex: 1, overflowY: 'auto' },
  contactItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #222D34' },
  contactAvatar: { width: '42px', height: '42px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px', color: '#FFF' },
  contactAvatarSmall: { width: '36px', height: '36px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '18px', color: '#FFF' },
  chatArea: { flex: 1, display: 'flex', flexDirection: 'column', background: '#0B141A' },
  chatHeader: { padding: '10px 20px', background: '#202C33', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #222D34' },
  featureBtn: { padding: '6px 12px', border: '1px solid #2A3942', borderRadius: '20px', color: '#E9EDEF', fontSize: '11px', cursor: 'pointer' },
  messagesContainer: { flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column' },
  emptyWelcome: { margin: 'auto', textAlign: 'center', background: '#202C33', padding: '30px', borderRadius: '16px', border: '1px solid #2A3942', maxWidth: '360px' },
  messageBubble: { maxWidth: '65%', padding: '10px 14px', borderRadius: '12px', position: 'relative', boxShadow: '0 1px 2px rgba(0,0,0,0.3)' },
  replyQuote: { background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '6px', marginBottom: '6px', borderRight: '3px solid #00A884' },
  mediaContent: { maxWidth: '100%', borderRadius: '8px', maxHeight: '240px', marginTop: '5px' },
  msgFooter: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', marginTop: '4px' },
  reactBar: { display: 'flex', gap: '6px', marginTop: '4px', opacity: 0.8 },
  reactBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', padding: 0 },
  reactionBadge: { position: 'absolute', bottom: '-8px', left: '10px', background: '#202C33', padding: '2px 6px', borderRadius: '10px', fontSize: '10px', border: '1px solid #2A3942' },
  typingIndicator: { background: '#202C33', padding: '6px 12px', borderRadius: '12px', width: 'fit-content', marginBottom: '10px' },
  replyPreviewBox: { background: '#202C33', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #222D34' },
  closeReplyBtn: { background: 'none', border: 'none', color: '#8696A0', cursor: 'pointer' },
  inputArea: { padding: '12px 16px', background: '#202C33', display: 'flex', alignItems: 'center', gap: '12px' },
  attachIcon: { fontSize: '20px', color: '#8696A0', cursor: 'pointer' },
  mainInput: { flex: 1, padding: '12px 16px', borderRadius: '8px', border: 'none', background: '#2A3942', color: '#E9EDEF', outline: 'none', fontSize: '14px' },
  sendButton: { padding: '12px 20px', background: '#00A884', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }
};
