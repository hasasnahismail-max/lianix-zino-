import React from 'react';

function App() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      textAlign: 'center',
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>LIANIX ZINO</h1>
      <p style={{ fontSize: '1.2rem', color: '#94a3b8' }}>E2EE Tactical Messenger</p>
      <div style={{
        marginTop: '20px',
        padding: '15px 25px',
        backgroundColor: '#1e293b',
        borderRadius: '8px',
        border: '1px solid #334155'
      }}>
        <p style={{ color: '#22c55e', margin: 0 }}>✓ Application is live and running successfully!</p>
      </div>
    </div>
  );
}

export default App;
