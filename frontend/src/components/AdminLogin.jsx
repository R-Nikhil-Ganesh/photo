import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Lock, Loader2 } from 'lucide-react';

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
    <div className="container py-2xl flex justify-center items-center">
       <div className="glass-panel text-center" style={{ maxWidth: '400px', width: '100%' }}>
          <Lock size={40} className="mb-md mx-auto" color="var(--primary)" />
          <h2 className="mb-lg">Admin Portal</h2>
          <form onSubmit={handleLogin} className="flex flex-col gap-sm">
             <input type="text" placeholder="Username" className="input-field" value={username} onChange={e => setUsername(e.target.value)} required />
             <input type="password" placeholder="Password" className="input-field" value={password} onChange={e => setPassword(e.target.value)} required />
             {error && <p style={{ color: '#ef4444', fontSize: '0.8rem' }}>{error}</p>}
             <button type="submit" className="btn-primary mt-sm" disabled={loading}>
                 {loading ? <Loader2 className="animate-spin mx-auto" /> : "Login"}
             </button>
          </form>
       </div>
    </div>
  );
}
