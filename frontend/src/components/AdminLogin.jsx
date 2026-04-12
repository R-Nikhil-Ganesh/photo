import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/admin/login`, { username, password });
      localStorage.setItem('admin_token', res.data.access_token);
      navigate('/admin/dashboard');
    } catch (err) {
      setError("Invalid admin credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex justify-center items-center" style={{ minHeight: '80vh' }}>
       <div className="glass-panel text-center" style={{ maxWidth: '400px', width: '100%' }}>
          <div className="auth-eyebrow">Administration</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.9rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.6rem', lineHeight: 1.2 }}>
            Admin Portal
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '2.5rem', fontWeight: 300 }}>
            Sign in to manage galleries, subscriptions, and settings.
          </p>
          <form onSubmit={handleLogin} className="flex flex-col gap-sm">
             <input type="text" placeholder="Username" className="input-field" value={username} onChange={e => setUsername(e.target.value)} required />
             <input type="password" placeholder="Password" className="input-field" value={password} onChange={e => setPassword(e.target.value)} required />
             {error && <p style={{ color: '#ef4444', fontSize: '0.78rem' }}>{error}</p>}
             <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }} disabled={loading}>
                 {loading ? <Loader2 className="animate-spin" size={18} /> : "Sign In"}
             </button>
          </form>
       </div>
    </div>
  );
}
