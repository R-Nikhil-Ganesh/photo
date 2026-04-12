import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Folder, Copy, Check, UploadCloud, Eye, ChevronLeft, UserCircle2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import GalleryUploader from './LiveBooth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function GalleryDashboard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [galleries, setGalleries] = useState([]);
  const [newGalleryName, setNewGalleryName] = useState('');
  const [activeGallery, setActiveGallery] = useState(null);
  const [copied, setCopied] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [subStatus, setSubStatus] = useState(null);

  useEffect(() => {
    if (token) {
      fetchGalleries();
      fetchStatus();
    }
  }, [token]);

  const fetchGalleries = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/gallery/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGalleries(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/subscription/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubStatus(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const createGallery = async () => {
    if (!newGalleryName) return;
    try {
      await axios.post(`${API_BASE_URL}/gallery/`, { name: newGalleryName }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewGalleryName('');
      fetchGalleries();
      fetchStatus(); // refresh counts
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to create folder");
    }
  };

  const copyLink = (link) => {
    const fullLink = `${window.location.origin}/gallery/${link}`;
    navigator.clipboard.writeText(fullLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="container fade">

      {/* No-face-profile prompt banner */}
      {!bannerDismissed && user && !user.has_face_encoding && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--spacing-md)',
          flexWrap: 'wrap',
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--spacing-sm) var(--spacing-md)',
          marginBottom: 'var(--spacing-lg)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f59e0b' }}>
            <UserCircle2 size={20} />
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
              Your account has no face photo yet — AI sorting won't work until you add one.
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => navigate('/signup')}
              style={{ background: '#f59e0b', color: '#000', border: 'none', borderRadius: 'var(--radius-sm)', padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
              Add Face Photo
            </button>
            <button
              onClick={() => setBannerDismissed(true)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
              title="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {!activeGallery ? (
        <>
          <header className="page-header">
            <div>
              <h1 className="mb-xs">Collections</h1>
              <p className="text-muted text-sm">Organize and distribute your event photography.</p>
              {subStatus && (
                <p style={{ fontSize: '0.75rem', color: '#555', marginTop: '4px' }}>
                  Folders used: {subStatus.owned_galleries} / {subStatus.allowed_galleries}
                </p>
              )}
            </div>
            
            <div className="header-actions">
              {subStatus?.can_create_gallery ? (
                <>
                  <input 
                    type="text" 
                    placeholder="Folder Name..." 
                    className="input-field" 
                    style={{ marginBottom: 0 }}
                    value={newGalleryName}
                    onChange={(e) => setNewGalleryName(e.target.value)}
                  />
                  <button onClick={createGallery} className="btn-primary" style={{ flex: '1 0 auto' }}>
                    New Collection
                  </button>
                </>
              ) : (
                <button onClick={() => navigate('/subscribe')} style={{ width: '100%', background: '#f59e0b', color: '#000', border: 'none', padding: '10px 18px', fontSize: '0.85rem', fontWeight: 600, borderRadius: '6px', cursor: 'pointer' }}>
                  Upgrade Plan to Create More
                </button>
              )}
            </div>
          </header>

          <div className="folder-grid">
            {galleries.map(g => (
              <div key={g.id} className="folder-card" onClick={() => setActiveGallery(g)}>
                <Folder className="text-muted mb-md" size={20} />
                <h3 className="text-sm">{g.name}</h3>
                <p className="text-xs text-muted" style={{ marginTop: '4px' }}>View & Upload</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="fade">
          <div className="flex items-center justify-between mb-lg">
             <button onClick={() => setActiveGallery(null)} className="btn-secondary flex items-center gap-sm">
               <ChevronLeft size={14} /> Back
             </button>
             <h2 className="text-sm font-semibold">{activeGallery.name.toUpperCase()}</h2>
          </div>
          
          <div className="switcher-group">
            <button className="switcher-btn active">
              <UploadCloud size={14} /> Upload
            </button>
            <button 
              className="switcher-btn"
              onClick={() => window.open(`/gallery/${activeGallery.access_link}`, '_blank')}
            >
              <Eye size={14} /> View Gallery
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-md" style={{ alignItems: 'start' }}>
            <div className="md:col-span-2">
              <GalleryUploader gallery={activeGallery} />
            </div>
            
            <aside>
              <div className="folder-card" style={{ padding: '24px' }}>
                <h4 className="text-xs uppercase tracking-widest text-muted mb-md">Shared Access</h4>
                <div className="flex gap-sm items-center bg-black p-sm rounded-sm border border-border mb-md">
                  <code className="flex-1 truncate text-xs text-muted">
                    {activeGallery.access_link}
                  </code>
                  <button onClick={() => copyLink(activeGallery.access_link)} className="btn-icon">
                    {copied ? <Check size={14} color="#fff" /> : <Copy size={14} />}
                  </button>
                </div>
                <p className="text-xs text-muted" style={{ lineHeight: '1.6' }}>
                  Anyone with this link can access the public gallery and find their faces via AI.
                </p>
              </div>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
