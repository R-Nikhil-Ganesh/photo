import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Settings, UploadCloud, Check, X, Loader2,
  Users, ImageIcon, FolderOpen, IndianRupee, Trash2
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: color + '18',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: color, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '1.6rem', fontWeight: 700, lineHeight: 1.1, color: 'var(--text)' }}>{value}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [token] = useState(localStorage.getItem('admin_token'));
  const [requests, setRequests] = useState([]);
  const [historyRequests, setHistoryRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [galleries, setGalleries] = useState([]);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) { navigate('/admin'); return; }
    fetchAll();
  }, [token]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [reqRes, histRes, statsRes, galRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/admin/requests`, { headers }),
        axios.get(`${API_BASE_URL}/admin/requests/history`, { headers }),
        axios.get(`${API_BASE_URL}/admin/stats`, { headers }),
        axios.get(`${API_BASE_URL}/admin/galleries`, { headers }),
      ]);
      setRequests(reqRes.data);
      setHistoryRequests(histRes.data);
      setStats(statsRes.data);
      setGalleries(galRes.data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('admin_token');
        navigate('/admin');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQrUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingQr(true);
    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'ml_default');
      const cResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
      const cData = await cResponse.json();
      if (!cResponse.ok) throw new Error("Cloudinary error");
      await axios.put(`${API_BASE_URL}/admin/qr`, { qr_url: cData.secure_url }, { headers });
      alert("QR code updated successfully!");
    } catch { alert("Failed to upload QR."); }
    finally { setUploadingQr(false); }
  };

  const processRequest = async (id, action) => {
    try {
      await axios.post(`${API_BASE_URL}/admin/requests/${id}/${action}`, {}, { headers });
      fetchAll();
    } catch { alert(`Failed to ${action} request`); }
  };

  const deleteGallery = async (id, name) => {
    if (!window.confirm(`Delete gallery "${name}" and all its photos? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await axios.delete(`${API_BASE_URL}/admin/galleries/${id}`, { headers });
      setGalleries(prev => prev.filter(g => g.id !== id));
      fetchAll();
    } catch { alert("Failed to delete gallery."); }
    finally { setDeletingId(null); }
  };

  const logout = () => { localStorage.removeItem('admin_token'); navigate('/admin'); };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Loader2 size={28} className="animate-spin" style={{ color: 'var(--primary)' }} />
    </div>
  );

  const tabs = ['overview', 'subscriptions', 'galleries', 'history'];

  return (
    <div className="container animate-fade-in" style={{ paddingTop: 32, paddingBottom: 64 }}>
      {/* Header */}
      <div className="flex justify-between items-center" style={{ marginBottom: 32 }}>
        <div className="flex items-center gap-sm">
          <Settings size={22} style={{ color: 'var(--primary)' }} />
          <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>Admin Console</span>
        </div>
        <button onClick={logout} className="btn-secondary">Logout</button>
      </div>

      {/* Stats Row */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 36 }}>
          <StatCard icon={<Users size={20} />}      label="Total Members"   value={stats.total_members}  color="#6366f1" />
          <StatCard icon={<Users size={20} />}      label="Subscribed"      value={stats.subscribed}     color="#22c55e" />
          <StatCard icon={<FolderOpen size={20} />} label="Total Folders"   value={stats.total_folders}  color="#f59e0b" />
          <StatCard icon={<ImageIcon size={20} />}  label="Total Photos"    value={stats.total_photos}   color="#3b82f6" />
          <StatCard icon={<IndianRupee size={20} />} label="Est. Revenue"   value={`₹${stats.total_revenue}`} color="#10b981" />
        </div>
      )}

      {/* Tabs */}
      <div className="switcher-group" style={{ marginBottom: 28 }}>
        {tabs.map(t => (
          <button key={t} className={`switcher-btn${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'subscriptions' && requests.length > 0 && (
              <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: 99, padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700 }}>
                {requests.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="glass-panel">
          <h3 className="text-sm uppercase text-muted tracking-widest mb-md">Payment QR Code</h3>
          <input type="file" id="qr-upload" accept="image/*" onChange={handleQrUpload} style={{ display: 'none' }} />
          <label htmlFor="qr-upload" className="btn-primary cursor-pointer" style={{ display: 'inline-flex', gap: 8 }}>
            {uploadingQr ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
            Upload New QR
          </label>
          <p className="text-xs text-dim mt-sm">Displayed to users when they request more folders.</p>
        </div>
      )}

      {/* Subscriptions Tab */}
      {activeTab === 'subscriptions' && (
        <div className="glass-panel">
          <h3 className="text-sm uppercase text-muted tracking-widest mb-md">Pending Requests</h3>
          {requests.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-surface)', borderRadius: 'var(--radius)' }}>
              No pending requests.
            </div>
          ) : (
            <div className="flex flex-col gap-md">
              {requests.map(req => (
                <div key={req.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                  <div>
                    <p className="font-semibold">{req.user_email}</p>
                    <p className="text-xs text-muted">Folders requested: {req.requested_folders}</p>
                    <a href={req.screenshot_url} target="_blank" rel="noreferrer" className="text-xs" style={{ color: 'var(--primary)' }}>View Screenshot ↗</a>
                  </div>
                  <div className="flex gap-sm">
                    <button onClick={() => processRequest(req.id, 'approve')} style={{ background: '#22c55e', color: '#000', border: 'none', padding: '7px 14px', borderRadius: 'var(--radius)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Check size={14} /> Approve
                    </button>
                    <button onClick={() => processRequest(req.id, 'reject')} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 'var(--radius)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <X size={14} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Galleries Tab */}
      {activeTab === 'galleries' && (
        <div className="glass-panel">
          <h3 className="text-sm uppercase text-muted tracking-widest mb-md">All Galleries ({galleries.length})</h3>
          {galleries.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-surface)', borderRadius: 'var(--radius)' }}>
              No galleries yet.
            </div>
          ) : (
            <div className="flex flex-col gap-md">
              {galleries.map(g => (
                <div key={g.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                  <div>
                    <p className="font-semibold">{g.name}</p>
                    <p className="text-xs text-muted">{g.owner_email} &middot; {g.photo_count} photos</p>
                    <p className="text-xs text-dim">/{g.access_link}</p>
                  </div>
                  <button
                    onClick={() => deleteGallery(g.id, g.name)}
                    disabled={deletingId === g.id}
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', padding: '7px 14px', borderRadius: 'var(--radius)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    {deletingId === g.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="glass-panel">
          <h3 className="text-sm uppercase text-muted tracking-widest mb-md">Request History</h3>
          {historyRequests.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-surface)', borderRadius: 'var(--radius)' }}>
              No past requests.
            </div>
          ) : (
            <div className="flex flex-col gap-md">
              {historyRequests.map(req => (
                <div key={req.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                  <div>
                    <p className="font-semibold text-muted">{req.user_email}</p>
                    <p className="text-xs text-muted">Folders: {req.requested_folders}</p>
                    <a href={req.screenshot_url} target="_blank" rel="noreferrer" className="text-xs" style={{ color: 'var(--primary)', opacity: 0.8 }}>Screenshot ↗</a>
                  </div>
                  <span style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700,
                    background: req.status === 'approved' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                    color: req.status === 'approved' ? '#22c55e' : '#ef4444',
                  }}>
                    {req.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
