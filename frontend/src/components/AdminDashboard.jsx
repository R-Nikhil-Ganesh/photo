import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud, Check, X, Loader2,
  Users, ImageIcon, FolderOpen, IndianRupee, Trash2
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{
      background: 'var(--bg)',
      border: '1px solid var(--border)',
      padding: '20px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '1px',
        background: `linear-gradient(90deg, transparent, ${color}40, transparent)`,
      }} />
      <div style={{
        width: 40, height: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: color, flexShrink: 0, opacity: 0.7,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.1, color: 'var(--text)', fontFamily: 'var(--font-serif)' }}>{value}</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
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
      <Loader2 size={28} className="animate-spin" style={{ color: 'var(--gold)' }} />
    </div>
  );

  const tabs = ['overview', 'subscriptions', 'galleries', 'history'];

  return (
    <div className="container animate-fade-in" style={{ paddingTop: 32, paddingBottom: 64 }}>
      {/* Header */}
      <div className="page-header" style={{ borderBottom: 'none', paddingBottom: '1rem' }}>
        <div>
          <div className="page-eyebrow">Administration</div>
          <div className="page-title">Console</div>
        </div>
        <button onClick={logout} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem 1rem' }}>Logout</button>
      </div>

      {/* Stats Row */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)', marginBottom: 36 }}>
          <StatCard icon={<Users size={20} />}      label="Total Members"   value={stats.total_members}  color="#c9a96e" />
          <StatCard icon={<Users size={20} />}      label="Subscribed"      value={stats.subscribed}     color="#22c55e" />
          <StatCard icon={<FolderOpen size={20} />} label="Total Folders"   value={stats.total_folders}  color="#c9a96e" />
          <StatCard icon={<ImageIcon size={20} />}  label="Total Photos"    value={stats.total_photos}   color="#c9a96e" />
          <StatCard icon={<IndianRupee size={20} />} label="Est. Revenue"   value={`₹${stats.total_revenue}`} color="#22c55e" />
        </div>
      )}

      {/* Tabs */}
      <div className="switcher-group" style={{ marginBottom: 28 }}>
        {tabs.map(t => (
          <button key={t} className={`switcher-btn${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'subscriptions' && requests.length > 0 && (
              <span style={{ background: 'var(--gold)', color: '#050508', borderRadius: 2, padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700 }}>
                {requests.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', padding: '2rem' }}>
          <div className="panel-label">Payment QR Code</div>
          <input type="file" id="qr-upload" accept="image/*" onChange={handleQrUpload} style={{ display: 'none' }} />
          <label htmlFor="qr-upload" className="btn-primary cursor-pointer" style={{ display: 'inline-flex', gap: 8 }}>
            {uploadingQr ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
            Upload New QR
          </label>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.8rem', fontWeight: 300 }}>Displayed to users when they request more folders.</p>
        </div>
      )}

      {/* Subscriptions Tab */}
      {activeTab === 'subscriptions' && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', padding: '2rem' }}>
          <div className="panel-label">Pending Requests</div>
          {requests.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              No pending requests.
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: '1px' }}>
              {requests.map(req => (
                <div key={req.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div>
                    <p style={{ fontWeight: 500, fontSize: '0.88rem', color: 'var(--text)' }}>{req.user_email}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Folders requested: {req.requested_folders}</p>
                    <a href={req.screenshot_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.72rem', color: 'var(--gold)', letterSpacing: '0.04em' }}>View Screenshot ↗</a>
                  </div>
                  <div className="flex gap-sm">
                    <button onClick={() => processRequest(req.id, 'approve')} style={{ background: '#22c55e', color: '#050508', border: 'none', padding: '7px 14px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      <Check size={14} /> Approve
                    </button>
                    <button onClick={() => processRequest(req.id, 'reject')} style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '7px 14px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
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
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', padding: '2rem' }}>
          <div className="panel-label">All Galleries ({galleries.length})</div>
          {galleries.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              No galleries yet.
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: '1px' }}>
              {galleries.map(g => (
                <div key={g.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div>
                    <p style={{ fontWeight: 500, fontSize: '0.88rem', color: 'var(--text)' }}>{g.name}</p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{g.owner_email} · {g.photo_count} photos</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', opacity: 0.6, fontFamily: 'monospace', letterSpacing: '0.05em' }}>/{g.access_link}</p>
                  </div>
                  <button
                    onClick={() => deleteGallery(g.id, g.name)}
                    disabled={deletingId === g.id}
                    style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', padding: '7px 14px', fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, letterSpacing: '0.06em', textTransform: 'uppercase' }}
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
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', padding: '2rem' }}>
          <div className="panel-label">Request History</div>
          {historyRequests.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              No past requests.
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: '1px' }}>
              {historyRequests.map(req => (
                <div key={req.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div>
                    <p style={{ fontWeight: 500, fontSize: '0.88rem', color: 'var(--text-muted)' }}>{req.user_email}</p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Folders: {req.requested_folders}</p>
                    <a href={req.screenshot_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.72rem', color: 'var(--gold)', opacity: 0.7, letterSpacing: '0.04em' }}>Screenshot ↗</a>
                  </div>
                  <span style={{
                    padding: '4px 10px', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                    background: req.status === 'approved' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    color: req.status === 'approved' ? '#22c55e' : '#ef4444',
                    border: `1px solid ${req.status === 'approved' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
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
