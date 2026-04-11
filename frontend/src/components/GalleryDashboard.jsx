import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Folder, Plus, ChevronRight, Loader2, Camera } from 'lucide-react';
import LiveBooth from './LiveBooth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function GalleryDashboard() {
  const [galleries, setGalleries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeGallery, setActiveGallery] = useState(null);
  const [newGalleryName, setNewGalleryName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchGalleries();
  }, []);

  const fetchGalleries = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/gallery/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGalleries(res.data);
    } catch (err) {
      console.error("Failed to fetch galleries", err);
    } finally {
      setLoading(false);
    }
  };

  const createGallery = async (e) => {
    e.preventDefault();
    if (!newGalleryName) return;
    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/gallery/`, { name: newGalleryName }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewGalleryName('');
      fetchGalleries();
    } catch (err) {
      alert("Failed to create folder");
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <Loader2 className="animate-spin" />;

  return (
    <div className="dashboard-container">
      {activeGallery ? (
        <div className="animate-fade-in">
          <button onClick={() => setActiveGallery(null)} className="btn-secondary mb-md">← Back to Folders</button>
          <LiveBooth gallery={activeGallery} />
        </div>
      ) : (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-xl">
            <h2 className="mb-0">Your Folders</h2>
            <form onSubmit={createGallery} className="flex gap-sm">
              <input 
                className="btn-secondary" 
                placeholder="New Folder Name" 
                value={newGalleryName} 
                onChange={e => setNewGalleryName(e.target.value)} 
                style={{ background: 'var(--bg-input)', border: 'none', padding: '10px 15px' }}
              />
              <button className="btn-primary" disabled={creating}>
                <Plus size={18} /> {creating ? 'Creating...' : 'Create'}
              </button>
            </form>
          </div>

          <div className="folders-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--spacing-lg)' }}>
            {galleries.map(g => (
              <div 
                key={g.id} 
                className="folder-card glass-panel" 
                style={{ cursor: 'pointer', padding: 'var(--spacing-lg)', textAlign: 'center' }}
                onClick={() => setActiveGallery(g)}
              >
                <Folder size={48} color="var(--primary)" style={{ margin: '0 auto var(--spacing-sm)' }} />
                <h4 style={{ margin: 0 }}>{g.name}</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{g.access_link}</p>
                <div className="flex items-center justify-center gap-sm mt-md text-primary" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  <Camera size={14} /> Open Booth <ChevronRight size={14} />
                </div>
              </div>
            ))}
            
            {galleries.length === 0 && (
              <div className="glass-panel" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
                <p>No folders created yet. Create one to start taking live photos!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
