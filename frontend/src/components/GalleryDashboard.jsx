import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Folder, Copy, Check, UploadCloud, Eye, ChevronLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GalleryUploader from './LiveBooth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function GalleryDashboard() {
  const { token } = useAuth();
  const [galleries, setGalleries] = useState([]);
  const [newGalleryName, setNewGalleryName] = useState('');
  const [activeGallery, setActiveGallery] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (token) fetchGalleries();
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

  const createGallery = async () => {
    if (!newGalleryName) return;
    try {
      await axios.post(`${API_BASE_URL}/gallery/`, { name: newGalleryName }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewGalleryName('');
      fetchGalleries();
    } catch (err) {
      console.error(err);
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
      {!activeGallery ? (
        <>
          <header className="page-header">
            <div>
              <h1 className="mb-xs">Collections</h1>
              <p className="text-muted text-sm">Organize and distribute your event photography.</p>
            </div>
            <div className="flex gap-sm">
              <input 
                type="text" 
                placeholder="Folder Name..." 
                className="input-field" 
                value={newGalleryName}
                onChange={(e) => setNewGalleryName(e.target.value)}
              />
              <button onClick={createGallery} className="btn-primary">
                New Collection
              </button>
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
