import React, { useState } from 'react';

export default function App() {
  const [secretKey, setSecretKey] = useState('ZINO-TACTICAL-KEY-2026');
  const [message, setMessage] = useState('');
  const [chatLog, setChatLog] = useState([
    { id: 1, sender: 'النظام', text: 'تم إنشاء قناة الاتصال المشفرة بنجاح (E2EE Active).', type: 'system' }
  ]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const newMessage = {
      id: Date.now(),
      sender: 'أنت',
      text: message,
      type: 'user'
    };

    setChatLog((prev) => [...prev, newMessage]);
    setMessage('');
  };

  return (
    <div style={styles.container}>
      {/* Header & Tactical Logo */}
      <header style={styles.header}>
        <div style={styles.logoContainer}>
          <svg style={styles.logoIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-5.45 9-12V7l-9-5z" stroke="#00f0ff" fill="#0f172a" />
            <path d="M12 8v8M8 12h8" stroke="#00ff88" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div>
            <h1 style={styles.title}>LIANIX ZINO</h1>
            <span style={styles.subtitle}>E2EE TACTICAL MESSENGER</span>
          </div>
        </div>
        <div style={styles.statusBadge}>
          <span style={styles.statusDot}></span>
          <span>مشفر (AES-256)</span>
        </div>
      </header>

      {/* Encryption Key Control Panel */}
      <div style={styles.keyPanel}>
        <label style={styles.keyLabel}>مفتاح التشفير المشترك (SECRET KEY):</label>
        <input
          type="text"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          style={styles.keyInput}
        />
      </div>

      {/* Chat Display Box */}
      <div style={styles.chatBox}>
        {chatLog.map((msg) => (
          <div
            key={msg.id}
            style={{
              ...styles.messageContainer,
              justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            <div
              style={{
                ...styles.messageBubble,
                ...(msg.type === 'user' ? styles.userBubble : msg.type === 'system' ? styles.systemBubble : styles.receivedBubble)
              }}
            >
              <div style={styles.senderName}>{msg.sender}</div>
              <div>{msg.text}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Message Input Controls */}
      <form onSubmit={handleSend} style={styles.inputForm}>
        <input
          type="text"
          placeholder="اكتب رسالتك المشفرة هنا..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={styles.messageInput}
        />
        <button type="submit" style={styles.sendButton}>
          إرسال مشفر
        </button>
      </form>
    </div>
  );
}

/* Tactical UI Styles */
const styles = {
  container: {
    backgroundColor: '#0a0e17',
    color: '#e2e8f0',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    padding: '15px',
    boxSizing: 'border-box'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '15px',
    borderBottom: '1px solid #1e293b',
    marginBottom: '15px'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  logoIcon: {
    width: '38px',
    height: '38px'
  },
  title: {
    margin: 0,
    fontSize: '1.4rem',
    letterSpacing: '2px',
    color: '#00f0ff',
    fontWeight: 'bold'
  },
  subtitle: {
    fontSize: '0.65rem',
    color: '#64748b',
    letterSpacing: '1.5px',
    display: 'block'
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    border: '1px solid #00ff88',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '0.75rem',
    color: '#00ff88'
  },
  statusDot: {
    width: '8px',
    height: '8px',
    backgroundColor: '#00ff88',
    borderRadius: '50%'
  },
  keyPanel: {
    backgroundColor: '#111827',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #1f2937',
    marginBottom: '15px'
  },
  keyLabel: {
    display: 'block',
    fontSize: '0.75rem',
    color: '#9ca3af',
    marginBottom: '6px'
  },
  keyInput: {
    width: '100%',
    backgroundColor: '#030712',
    border: '1px solid #374151',
    color: '#00f0ff',
    padding: '8px 12px',
    borderRadius: '6px',
    fontFamily: 'monospace',
    boxSizing: 'border-box'
  },
  chatBox: {
    flex: 1,
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    padding: '15px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    minHeight: '350px',
    marginBottom: '15px'
  },
  messageContainer: {
    display: 'flex'
  },
  messageBubble: {
    maxWidth: '80%',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '0.9rem',
    lineHeight: '1.4'
  },
  userBubble: {
    backgroundColor: '#0284c7',
    color: '#ffffff',
    borderBottomRightRadius: '2px'
  },
  receivedBubble: {
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    borderBottomLeftRadius: '2px'
  },
  systemBubble: {
    backgroundColor: 'rgba(0, 240, 255, 0.05)',
    border: '1px stroke #00f0ff',
    color: '#38bdf8',
    width: '100%',
    textAlign: 'center',
    fontSize: '0.8rem'
  },
  senderName: {
    fontSize: '0.7rem',
    opacity: 0.8,
    marginBottom: '4px'
  },
  inputForm: {
    display: 'flex',
    gap: '10px'
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    color: '#ffffff',
    padding: '12px 15px',
    borderRadius: '8px',
    fontSize: '0.9rem',
    outline: 'none'
  },
  sendButton: {
    backgroundColor: '#00f0ff',
    color: '#0f172a',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer'
  }
};
