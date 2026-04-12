import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Loader2, User, Filter, Image as ImageIcon, Download, ChevronLeft } from 'lucide-react';
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
  const [noFaceProfile, setNoFaceProfile] = useState(false);
  
  const [galleryFaces, setGalleryFaces] = useState([]);
  const [selectedFaceUrl, setSelectedFaceUrl] = useState(null); // tracking the clicked avatar
  const [myMatchedUrls, setMyMatchedUrls] = useState([]); // user's own matches

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
          const matches = searchRes.data.matched_public_ids;
          setMatchedUrls(matches);
          setMyMatchedUrls(matches);
          // If we found matches, keep filter on. If none, show all with a hint.
          setIsFiltered(matches.length > 0);
        } catch (sErr) {
          if (sErr.response?.status === 400) {
            // User exists but has no face encoding saved — prompt them
            setNoFaceProfile(true);
          }
          console.error("Search failed, showing all photos", sErr);
          setIsFiltered(false);
        }
      } else {
        setIsFiltered(false);
      }
      // 3. Fetch all faces for "Face sort"
      try {
          const facesRes = await axios.get(`${API_BASE_URL}/gallery/public/${accessLink}/faces`);
          setGalleryFaces(facesRes.data || []);
      } catch (fErr) {
          console.error("Failed to load gallery faces", fErr);
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
      <div className="mb-md">
        <button onClick={() => navigate(-1)} className="btn-secondary flex items-center gap-xs" style={{ padding: '6px 12px', fontSize: '0.8rem', border: 'none', background: 'transparent', color: 'var(--text-muted)' }}>
           <ChevronLeft size={16} /> Back
        </button>
      </div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-xl gap-md">
        <div>
          <h1 className="text-gradient mb-xs">{galleryName}</h1>
          <p className="text-sm text-muted">
            Viewing {displayedPhotos.length} of {allPhotos.length} photos
          </p>
        </div>

        <div className="flex gap-sm w-full md:w-auto">
          {token ? (
            <div className="flex flex-col items-center">
              {myMatchedUrls.length > 0 ? (
                <button 
                  onClick={() => {
                      if (!isFiltered) {
                          setMatchedUrls(myMatchedUrls);
                          setSelectedFaceUrl(null);
                          setIsFiltered(true);
                      } else {
                          setIsFiltered(false);
                          setSelectedFaceUrl(null);
                      }
                  }} 
                  title={isFiltered ? "Show All Photos" : "Show My Photos"}
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    padding: 0,
                    border: isFiltered ? '3px solid var(--primary)' : '2px solid transparent',
                    background: 'transparent',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    transition: 'all 0.2s',
                    opacity: isFiltered ? 1 : 0.6,
                    boxShadow: isFiltered ? '0 0 10px rgba(59, 130, 246, 0.5)' : 'none'
                  }}
                >
                  <img 
                    src={myMatchedUrls[0].replace('/upload/', '/upload/c_thumb,g_face,w_100,h_100/')} 
                    alt="My Face" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </button>
              ) : (
                <button 
                  disabled
                  className="btn-secondary"
                  title="No matches found for you"
                >
                  <User size={18} /> No Matches
                </button>
              )}
            </div>
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

      {noFaceProfile && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--spacing-md)',
          marginBottom: 'var(--spacing-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--spacing-md)',
          flexWrap: 'wrap'
        }}>
          <p style={{ margin: 0, color: '#f59e0b', fontSize: '0.9rem' }}>
            ⚠️ Your account has no face profile. Complete setup to enable AI face sorting.
          </p>
          <button
            onClick={() => navigate(`/signup?returnTo=/gallery/${accessLink}`)}
            style={{ background: '#f59e0b', color: '#000', border: 'none', borderRadius: 'var(--radius-sm)', padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap' }}
          >
            Complete Profile →
          </button>
        </div>
      )}

      {/* DISTINCT FACES TRAY */}
      {galleryFaces.length > 0 && (
        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <h4 className="mb-sm text-sm text-muted">Faces in this Gallery</h4>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)', overflowX: 'auto', paddingBottom: 'var(--spacing-sm)' }}>
            {galleryFaces.map((f, idx) => {
              // f.bounding_box is [top, right, bottom, left]
              let avatarSrc = f.avatar_url;
              if (f.bounding_box && f.avatar_url.includes('/upload/')) {
                  const [top, right, bottom, left] = f.bounding_box;
                  const w = right - left;
                  const h = bottom - top;
                  // Try to apply native cloudinary crop
                  avatarSrc = f.avatar_url.replace('/upload/', `/upload/c_crop,x_${Math.max(0, left)},y_${Math.max(0, top)},w_${w},h_${h}/w_100,h_100,c_fill/`);
              }

              const isSelected = selectedFaceUrl === f.avatar_url;

              return (
                  <div 
                      key={idx} 
                      onClick={() => {
                          if (isSelected) {
                              setSelectedFaceUrl(null);
                              setIsFiltered(false); // remove filter
                          } else {
                              setSelectedFaceUrl(f.avatar_url);
                              setMatchedUrls(f.matched_urls);
                              setIsFiltered(true);
                          }
                      }}
                      style={{ 
                          cursor: 'pointer', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          gap: '4px',
                          flexShrink: 0,
                          opacity: (selectedFaceUrl && !isSelected) ? 0.4 : 1,
                          transition: 'opacity 0.2s'
                      }}
                  >
                      <img 
                          src={avatarSrc} 
                          alt="Face" 
                          style={{
                              width: '64px', 
                              height: '64px', 
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: isSelected ? '3px solid var(--primary)' : '2px solid transparent',
                              boxShadow: 'var(--shadow-md)'
                          }}
                      />
                      <span className="text-xs text-muted font-medium">{f.count} photos</span>
                  </div>
              );
            })}
          </div>
        </div>
      )}


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
        <div className="insta-grid">
          {displayedPhotos.map((photo) => {
            // Display a smaller, optimized version for the gallery grid
            const displayUrl = photo.url.includes('/upload/') 
               ? photo.url.replace('/upload/', '/upload/c_fill,w_500,h_500,q_auto/') 
               : photo.url;
               
            return (
              <div key={photo.id} className="insta-item group">
                <img src={displayUrl} alt="Event" className="gallery-img" loading="lazy" />
                <div className="insta-overlay">
                   <button onClick={() => saveAs(photo.url, 'photo.jpg')} title="Download High-Res" className="btn-download-premium">
                      <Download size={16} /> Download
                   </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
