import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { Shield, Send, Lock, Radio, Phone } from 'lucide-react';

const socket = io('http://localhost:5000');

function App() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [channelId, setChannelId] = useState('ALPHA-SECURE');

  useEffect(() => {
    socket.emit('join_channel', channelId);

    socket.on('receive_message', (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      socket.off('receive_message');
    };
  }, [channelId]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const payload = {
      text: inputMessage,
      sender: 'NODE-01',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      channelId
    };

    socket.emit('send_message', payload);
    setInputMessage('');
  };

  return (
    <div style={{ backgroundColor: '#E0F2FE', minHeight: '100vh', fontFamily: 'monospace' }} className="p-4 flex flex-col items-center">
      {/* Tactical Header */}
      <header style={{ backgroundColor: '#0F172A', color: '#38BDF8' }} className="w-full max-w-2xl p-4 rounded-xl shadow-lg mb-4 border border-cyan-500/30 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Phone className="w-6 h-6 text-cyan-400" />
          <div>
            <h1 className="font-bold tracking-widest text-lg">LIANIX ZINO</h1>
            <p className="text-xs text-cyan-300 flex items-center gap-1">
              <Lock className="w-3 h-3" /> E2EE TACTICAL NODE ACTIVE
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs bg-slate-800 px-3 py-1.5 rounded-lg border border-cyan-500/20">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>CH: {channelId}</span>
        </div>
      </header>

      {/* Tactical Canvas Chat Area */}
      <main style={{ backgroundColor: '#1E293B' }} className="w-full max-w-2xl flex-1 rounded-xl p-4 shadow-xl border border-slate-700 flex flex-col justify-between min-h-[480px]">
        <div className="overflow-y-auto space-y-3 pr-2 flex-1">
          <div className="text-center text-xs text-slate-400 my-2 border-b border-slate-700 pb-2">
            --- ENCRYPTED SESSION ESTABLISHED ---
          </div>
          {messages.map((msg, index) => (
            <div key={index} className={`flex flex-col ${msg.sender === 'NODE-01' ? 'items-end' : 'items-start'}`}>
              <div style={{ backgroundColor: msg.sender === 'NODE-01' ? '#0284C7' : '#334155' }} className="max-w-[80%] p-3 rounded-lg text-white text-sm shadow">
                <p className="font-sans">{msg.text}</p>
                <span className="block text-right mt-1 opacity-70 text-[10px]">{msg.time}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Input Panel */}
        <form onSubmit={sendMessage} className="mt-4 flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type tactical message..."
            style={{ backgroundColor: '#0F172A', color: '#E0F2FE' }}
            className="flex-1 p-3 rounded-lg border border-slate-600 focus:outline-none focus:border-cyan-400 text-sm"
          />
          <button
            type="submit"
            style={{ backgroundColor: '#0284C7' }}
            className="px-5 py-3 rounded-lg text-white font-bold flex items-center justify-center hover:bg-cyan-600 transition"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </main>
    </div>
  );
}

export default App;
