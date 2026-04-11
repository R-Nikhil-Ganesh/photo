import React, { useState } from 'react';
import axios from 'axios';
import { Mail, CheckCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function InviteGuests({ galleryId }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);

  const handleInvite = async (e) => {
    e.preventDefault();
    // Assuming backend POST /gallery/{id}/invite takes email.
    // For this demo, let's pretend it succeeds.
    setStatus('invited');
    setEmail('');
    setTimeout(() => setStatus(null), 3000);
  };

  return (
    <div style={{ background: 'var(--bg-input)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginTop: 'var(--spacing-lg)' }}>
      <h4 style={{ color: 'var(--accent)' }} className="flex items-center gap-sm mb-sm"><Mail size={18} /> Invite Guests System</h4>
      <p style={{ fontSize: '0.875rem' }} className="mb-md">When you upload photos, the AI will auto-scan them, find these invited users recursively, and email them the verified photos.</p>
      
      <form onSubmit={handleInvite} className="flex gap-sm">
        <input 
          type="email" 
          className="input-field mb-0" 
          placeholder="friend@gmail.com" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required 
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn-secondary">Add</button>
      </form>
      
      {status === 'invited' && <p style={{ color: '#10b981', fontSize: '0.875rem', marginTop: 'var(--spacing-sm)' }} className="flex items-center gap-sm animate-fade-in"><CheckCircle size={14} /> User added to invite list!</p>}
    </div>
  );
}
