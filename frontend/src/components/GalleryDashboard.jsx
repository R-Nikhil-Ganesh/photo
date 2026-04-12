import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Folder, ArrowRight, Copy, Check, Image as ImageIcon, UploadCloud, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GalleryUploader from './LiveBooth';
import GalleryView from './GalleryView'; // We can't direct import and use easily because of useParams, but we can reuse logic or link out

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function GalleryDashboard() {
  const { token } = useAuth();
  const [galleries, setGalleries] = useState([]);
  const [newGalleryName, setNewGalleryName] = useState('');
  const [activeGallery, setActiveGallery] = useState(null);
  const [viewMode, setViewMode] = useState('manage'); // 'manage' or 'view'
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
    <div className="container py-lg animate-fade-in">
      {!activeGallery ? (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-xl gap-md">
            <div>
              <h1 className="text-gradient">Event Management</h1>
              <p className="text-muted">Create and manage your AI-powered photo folders.</p>
            </div>
            <div className="flex gap-sm w-full md:w-auto">
              <input 
                type="text" 
                placeholder="New Folder Name..." 
                className="input-field flex-1" 
                value={newGalleryName}
                onChange={(e) => setNewGalleryName(e.target.value)}
              />
              <button onClick={createGallery} className="btn-primary flex items-center gap-xs">
                <Plus size={18} /> Create
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
            {galleries.map(g => (
              <div key={g.id} className="glass-panel hover-card" onClick={() => { setActiveGallery(g); setViewMode('manage'); }}>
                <div className="flex items-start justify-between mb-md">
                  <div className="folder-icon-wrapper">
                    <Folder size={32} color="var(--primary)" />
                  </div>
                  <ArrowRight size={20} className="text-muted" />
                </div>
                <h3>{g.name}</h3>
                <p className="text-muted text-sm mt-xs">Click to manage or upload</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="animate-fade-in">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-lg gap-md">
             <button onClick={() => setActiveGallery(null)} className="btn-secondary">
               ← Main Dashboard
             </button>
             
             <div className="tab-switcher bg-glass p-xs rounded-lg flex">
                <button 
                  onClick={() => setViewMode('manage')}
                  className={`tab-btn ${viewMode === 'manage' ? 'active' : ''} flex items-center gap-xs px-md py-xs rounded-md`}
                >
                  <UploadCloud size={18} /> Manage & Upload
                </button>
                <button 
                  onClick={() => window.open(`/gallery/${activeGallery.access_link}`, '_blank')}
                  className={`tab-btn flex items-center gap-xs px-md py-xs rounded-md`}
                >
                  <Eye size={18} /> Open Gallery View
                </button>
             </div>
          </div>

          {viewMode === 'manage' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl">
              <div className="lg:col-span-2">
                <GalleryUploader gallery={activeGallery} />
              </div>
              
              <div className="flex flex-col gap-lg">
                <div className="glass-panel">
                  <h3 className="mb-md">Share Folder</h3>
                  <div className="flex gap-sm items-center bg-dark p-sm rounded-md border border-glass mb-md">
                    <code className="flex-1 truncate text-xs">
                      {window.location.origin}/gallery/{activeGallery.access_link}
                    </code>
                    <button onClick={() => copyLink(activeGallery.access_link)} className="btn-icon">
                      {copied ? <Check size={18} color="#10b981" /> : <Copy size={18} />}
                    </button>
                  </div>
                  <p className="text-muted text-sm border-t border-glass pt-sm">
                    Guests can use this link to see the whole folder and find themselves using AI.
                  </p>
                </div>

                <div className="glass-panel">
                  <h3 className="mb-md">Instructions</h3>
                  <ul className="text-sm space-y-sm text-muted">
                    <li>• Drag and drop or select multiple photos.</li>
                    <li>• Wait for AI to map each photo.</li>
                    <li>• Close the folder and revisit anytime.</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
