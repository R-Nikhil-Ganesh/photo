import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Folder, ArrowRight, Camera, Copy, Check, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GalleryUploader from './LiveBooth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function GalleryDashboard() {
  const { token } = useAuth();
  const [galleries, setGalleries] = useState([]);
  const [newGalleryName, setNewGalleryName] = useState('');
  const [activeGallery, setActiveGallery] = useState(null);
  const [galleryPhotos, setGalleryPhotos] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchGalleries();
  }, [token]);

  useEffect(() => {
    if (activeGallery) {
      fetchGalleryPhotos(activeGallery.id);
    }
  }, [activeGallery]);

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

  const fetchGalleryPhotos = async (galleryId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/gallery/${galleryId}/photos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGalleryPhotos(res.data);
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
          <div className="flex justify-between items-center mb-xl">
            <h2 className="text-gradient">Your Event Folders</h2>
            <div className="flex gap-sm">
              <input 
                type="text" 
                placeholder="Folder Name (e.g. Wedding)" 
                className="input-field" 
                value={newGalleryName}
                onChange={(e) => setNewGalleryName(e.target.value)}
              />
              <button onClick={createGallery} className="btn-primary flex items-center gap-xs">
                <Plus size={18} /> New Folder
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
            {galleries.map(g => (
              <div key={g.id} className="glass-panel hover-card" onClick={() => setActiveGallery(g)}>
                <div className="flex items-start justify-between mb-md">
                  <div className="folder-icon-wrapper">
                    <Folder size={32} color="var(--primary)" />
                  </div>
                  <ArrowRight size={20} className="text-muted" />
                </div>
                <h3>{g.name}</h3>
                <p className="text-muted text-sm mt-xs">Manage photos and shares</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="animate-fade-in">
          <button onClick={() => setActiveGallery(null)} className="btn-secondary mb-lg">
            ← Back to Folders
          </button>
          
          <div className="flex flex-col md:flex-row gap-lg items-start">
            <div className="flex-1 w-full">
               <GalleryUploader gallery={activeGallery} onUploadComplete={() => fetchGalleryPhotos(activeGallery.id)} />
               
               <div className="glass-panel mt-lg">
                 <h4 className="mb-md">Share Access</h4>
                 <div className="flex gap-sm items-center bg-dark p-sm rounded-md border border-glass">
                   <code className="flex-1 truncate text-sm">
                    {window.location.origin}/gallery/{activeGallery.access_link}
                   </code>
                   <button onClick={() => copyLink(activeGallery.access_link)} className="btn-icon">
                     {copied ? <Check size={18} color="#10b981" /> : <Copy size={18} />}
                   </button>
                 </div>
                 <p className="text-muted mt-sm text-xs">Anyone with this link can find their own photos using AI.</p>
               </div>
            </div>

            <div className="flex-1 w-full glass-panel" style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <h4 className="mb-md flex items-center gap-sm">
                <ImageIcon size={20} /> Preview All Photos ({galleryPhotos.length})
              </h4>
              
              {galleryPhotos.length === 0 ? (
                <div className="text-center py-xl text-muted">
                  <p>No photos in this folder yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-sm">
                  {galleryPhotos.map(p => (
                    <div key={p.id} className="aspect-square rounded-md overflow-hidden bg-dark">
                      <img src={p.url} alt="Gallery item" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
