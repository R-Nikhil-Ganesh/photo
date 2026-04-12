import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Loader2, User, Filter, Image as ImageIcon, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function GalleryView() {
  const { accessLink } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [galleryName, setGalleryName] = useState('');
  const [allPhotos, setAllPhotos] = useState([]);
  const [matchedUrls, setMatchedUrls] = useState([]);
  const [isFiltered, setIsFiltered] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadGalleryData();
  }, [accessLink, token]);

  const loadGalleryData = async () => {
    try {
      setLoading(true);
      // 1. Fetch entire gallery publicly
      const galleryRes = await axios.get(`${API_BASE_URL}/gallery/public/${accessLink}`);
      setGalleryName(galleryRes.data.name);
      setAllPhotos(galleryRes.data.photos);

      // 2. If logged in, fetch personal matches
      if (token) {
        try {
          const searchRes = await axios.get(`${API_BASE_URL}/search/${accessLink}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setMatchedUrls(searchRes.data.matched_public_ids);
          // If we found matches, keep it filtered. If none, maybe show all.
          if (searchRes.data.matched_public_ids.length === 0) {
            setIsFiltered(false);
          }
        } catch (sErr) {
          console.error("Search failed, showing all photos", sErr);
          setIsFiltered(false);
        }
      } else {
        setIsFiltered(false);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.status === 404 ? "Gallery not found." : "Failed to load gallery.");
    } finally {
      setLoading(false);
    }
  };

  const displayedPhotos = isFiltered ? allPhotos.filter(p => matchedUrls.includes(p.url)) : allPhotos;

  const downloadAll = async () => {
    setDownloading(true);
    const zip = new JSZip();
    const folder = zip.folder(galleryName);

    try {
      await Promise.all(displayedPhotos.map(async (photo, index) => {
        const response = await fetch(photo.url);
        const blob = await response.blob();
        folder.file(`photo_${index + 1}.jpg`, blob);
      }));

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${galleryName}_photos.zip`);
    } catch (err) {
      console.error(err);
      alert("Failed to download photos.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="container flex flex-col items-center justify-center" style={{ minHeight: '80vh' }}>
        <Loader2 className="animate-spin mb-md" size={48} color="var(--primary)" />
        <p>Opening {galleryName || 'Gallery'}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container text-center py-2xl">
        <h2 className="text-gradient">Oops!</h2>
        <p className="mb-lg">{error}</p>
        <button onClick={() => navigate('/')} className="btn-primary">Go Home</button>
      </div>
    );
  }

  return (
    <div className="container py-lg animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-xl gap-md">
        <div>
          <h1 className="text-gradient mb-xs">{galleryName}</h1>
          <p className="text-sm text-muted">
            Viewing {displayedPhotos.length} of {allPhotos.length} photos
          </p>
        </div>

        <div className="flex gap-sm w-full md:w-auto">
          {token ? (
            <button 
              onClick={() => setIsFiltered(!isFiltered)} 
              className={`btn-${isFiltered ? 'primary' : 'secondary'} flex items-center gap-xs flex-1 md:flex-initial`}
            >
              <Filter size={18} /> {isFiltered ? "Showing My Photos" : "Filter My Photos"}
            </button>
          ) : (
            <button onClick={() => navigate(`/signup?returnTo=/gallery/${accessLink}`)} className="btn-primary flex items-center gap-xs flex-1">
              <User size={18} /> Sign In to Find Your Face
            </button>
          )}
          
          <button 
            onClick={downloadAll} 
            disabled={downloading || displayedPhotos.length === 0}
            className="btn-secondary flex items-center gap-xs flex-1 md:flex-initial"
          >
            {downloading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
            {downloading ? "Zipping..." : "Download All"}
          </button>
        </div>
      </div>

      {displayedPhotos.length === 0 ? (
        <div className="glass-panel text-center py-2xl">
          <ImageIcon size={48} className="text-muted mb-md" style={{ margin: '0 auto' }} />
          <h3>No photos found</h3>
          <p className="text-muted">
            {isFiltered ? "AI couldn't find your face in this album." : "This gallery is empty."}
          </p>
          {isFiltered && <button onClick={() => setIsFiltered(false)} className="btn-secondary mt-lg">Show All Photos</button>}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-md">
          {displayedPhotos.map((photo) => (
            <div key={photo.id} className="gallery-item group">
              <img src={photo.url} alt="Event" className="gallery-img" loading="lazy" />
              <div className="gallery-overlay">
                 <button onClick={() => saveAs(photo.url, 'photo.jpg')} className="btn-icon bg-glass rounded-full p-xs">
                    <Download size={16} />
                 </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
