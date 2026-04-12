import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Copy, Check, ChevronLeft, UserCircle2, X } from 'lucide-react';
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
          gap: '16px',
          flexWrap: 'wrap',
          background: 'rgba(201,169,110,0.06)',
          border: '1px solid rgba(201,169,110,0.25)',
          padding: '14px 20px',
          marginBottom: '2.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--gold)' }}>
            <UserCircle2 size={18} />
            <span style={{ fontSize: '0.85rem', fontWeight: 400, letterSpacing: '0.02em' }}>
              Your account has no face photo yet — AI sorting won't work until you add one.
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => navigate('/signup')}
              className="btn-primary"
              style={{ fontSize: '0.75rem', padding: '0.4rem 1rem' }}
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
              <div className="page-eyebrow">Your workspace</div>
              <div className="page-title">Collections</div>
              <div className="page-sub">Organize and distribute your event photography</div>
              {subStatus && (
                <div className="usage-bar" style={{ marginTop: '1rem', marginBottom: 0 }}>
                  <div className="bar-label">{subStatus.owned_galleries} / {subStatus.allowed_galleries} folders used</div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${Math.min(100, (subStatus.owned_galleries / subStatus.allowed_galleries) * 100)}%` }}></div>
                  </div>
                  {subStatus.owned_galleries >= subStatus.allowed_galleries && (
                    <div className="bar-label" style={{ color: 'rgba(201,169,110,0.6)' }}>Limit reached</div>
                  )}
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {subStatus?.can_create_gallery && (
                <>
                  <input 
                    type="text" 
                    placeholder="Folder Name..." 
                    className="input-field" 
                    style={{ marginBottom: 0, maxWidth: '200px' }}
                    value={newGalleryName}
                    onChange={(e) => setNewGalleryName(e.target.value)}
                  />
                  <button onClick={createGallery} className="btn-primary">
                    New Collection
                  </button>
                </>
              )}
              <button 
                onClick={() => navigate('/subscribe')} 
                className="btn-upgrade"
              >
                ↑ {subStatus?.can_create_gallery ? 'Upgrade Plan' : 'Upgrade to Create More'}
              </button>
            </div>
          </header>

          <div className="folder-grid">
            {galleries.map(g => (
              <div key={g.id} className="folder-card" onClick={() => setActiveGallery(g)}>
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ marginBottom: '1.5rem', opacity: 0.4 }}>
                  <path d="M6 12a2 2 0 012-2h8l3 4h13a2 2 0 012 2v14a2 2 0 01-2 2H8a2 2 0 01-2-2V12z" stroke="#c9a96e" strokeWidth="1.2"/>
                </svg>
                <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text)', marginBottom: '0.4rem' }}>{g.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', letterSpacing: '0.04em' }}>View & Upload</div>
                <div style={{ position: 'absolute', top: '2rem', right: '2rem', fontSize: '1rem', color: 'rgba(201,169,110,0.3)', transition: 'all 0.2s' }}>↗</div>
              </div>
            ))}
            {subStatus?.can_create_gallery && (
              <div 
                style={{
                  background: 'transparent',
                  border: '1px dashed rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '0.8rem',
                  color: 'var(--text-dim)',
                  padding: '2rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => document.querySelector('.input-field')?.focus()}
              >
                <span style={{ fontSize: '1.2rem', opacity: 0.4 }}>+</span> New Collection
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="fade">
          <div className="page-breadcrumb">
            <span className="bc-link" onClick={() => setActiveGallery(null)}>Collections</span>
            <span className="breadcrumb-sep">/</span>
            <span style={{ color: 'rgba(232,228,220,0.6)' }}>{activeGallery.name}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '2rem' }}>
            <div className="page-title" style={{ fontSize: '2rem' }}>{activeGallery.name}</div>
          </div>
          
          <div className="upload-layout">
            <div className="upload-main">
              <div className="switcher-group">
                <button className="switcher-btn active">
                  Upload
                </button>
                <button 
                  className="switcher-btn"
                  onClick={() => navigate(`/gallery/${activeGallery.access_link}`)}
                >
                  View Gallery
                </button>
              </div>

              <GalleryUploader gallery={activeGallery} />
            </div>
            
            <div className="sidebar-panel">
              <div className="panel-label">Shared Access</div>
              <div className="access-code">
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeGallery.access_link}</span>
                <button onClick={() => copyLink(activeGallery.access_link)} className="copy-btn">
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: 1.7, fontWeight: 300 }}>
                Anyone with this link can access the public gallery and find their faces via AI face matching.
              </div>
              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                <div className="panel-label">Quick Link</div>
                <button 
                  className="btn-ghost" 
                  style={{ width: '100%', fontSize: '0.75rem', padding: '0.6rem' }}
                  onClick={() => {
                    const fullLink = `${window.location.origin}/gallery/${activeGallery.access_link}`;
                    navigator.clipboard.writeText(fullLink);
                  }}
                >
                  Share Gallery Link →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
