import React, { useState } from 'react';
import axios from 'axios';
import { UploadCloud, Link as LinkIcon, Loader2 } from 'lucide-react';
import InviteGuests from './InviteGuests';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function UploadGallery() {
  const { token } = useAuth();
  const [galleryName, setGalleryName] = useState('');
  const [accessLink, setAccessLink] = useState('');
  const [loading, setLoading] = useState(false);

  const createGallery = async (e) => {
    e.preventDefault();
    if (!galleryName) return;

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/gallery/`, { name: galleryName }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAccessLink(response.data.access_link);
    } catch (err) {
      console.error("Error creating gallery", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div className="glass-panel" style={{ maxWidth: '500px', width: '100%', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--spacing-md)' }}>
          <UploadCloud size={48} color="var(--primary)" />
        </div>
        <h2 className="text-gradient">Create a Event</h2>
        <p>Host a new gallery and generate a unique Framy link for your guests.</p>

        {!accessLink ? (
          <form onSubmit={createGallery}>
            <input
              type="text"
              className="input-field"
              placeholder="e.g., Jane's Wedding 2024"
              value={galleryName}
              onChange={(e) => setGalleryName(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : 'Generate Gallery Link'}
            </button>
          </form>
        ) : (
          <div className="animate-fade-in" style={{ background: 'var(--bg-input)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <h4 style={{ color: 'var(--primary)' }}>Gallery Created!</h4>
            <p className="mb-md">Share this link with your guests so they can find their photos:</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', background: 'var(--bg-dark)', padding: 'var(--spacing-sm)', borderRadius: 'var(--radius-sm)' }}>
              <LinkIcon size={16} color="var(--text-muted)" />
              <code style={{ color: 'var(--accent)', flex: 1, textAlign: 'left' }}>
                {window.location.origin}/gallery/{accessLink}
              </code>
            </div>

            <div style={{ marginTop: 'var(--spacing-xl)', paddingTop: 'var(--spacing-md)', borderTop: 'var(--glass-border)' }}>
              <p style={{ fontSize: '0.875rem' }}>Upload photos directly to Cloudinary using your preset, and they will automatically sync to this gallery using the webhook.</p>
            </div>
            
            <InviteGuests galleryId={accessLink} />
          </div>
        )}
      </div>
    </div>
  );
}
