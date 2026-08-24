'use client';

import { useState } from 'react';

export default function AdminSyncButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSync = async () => {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync data.');
      }

      setMessage(data.message || 'Sync successful!');
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Pharmacy Price Management</h1>
      <button
        onClick={handleSync}
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: loading ? '#ccc' : '#0070f3',
          color: '#fff',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
        }}
      >
        {loading ? 'Syncing with Google Sheets...' : 'Sync Pharmacy Prices'}
      </button>

      {message && (
        <p style={{ marginTop: '10px', fontSize: '14px', color: message.startsWith('Error') ? 'red' : 'green' }}>
          {message}
        </p>
      )}
    </div>
  );
}
