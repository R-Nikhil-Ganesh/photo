import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Loader2, User, Download, ChevronLeft } from 'lucide-react';
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
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--gold)', marginBottom: '16px' }} />
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Opening {galleryName || 'Gallery'}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container text-center py-2xl">
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--text)', marginBottom: '1rem' }}>Gallery Not Found</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>{error}</p>
        <button onClick={() => navigate('/')} className="btn-primary">Return Home</button>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in" style={{ paddingTop: '1.5rem', paddingBottom: '3rem' }}>
      {/* Breadcrumb */}
      <div className="page-breadcrumb">
        <span className="bc-link" onClick={() => navigate('/')}>Home</span>
        <span className="breadcrumb-sep">/</span>
        <span style={{ color: 'rgba(232,228,220,0.6)' }}>{galleryName}</span>
      </div>

      {/* Header */}
      <div className="page-header" style={{ borderBottom: 'none', paddingBottom: '1rem' }}>
        <div>
          <div className="page-eyebrow">Gallery</div>
          <h1 className="page-title">{galleryName}</h1>
          <div className="page-sub">
            {displayedPhotos.length} of {allPhotos.length} photos
            {isFiltered && ' · Filtered by face'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {token ? (
            myMatchedUrls.length > 0 ? (
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
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  padding: 0,
                  border: isFiltered ? '2px solid var(--gold)' : '1px solid var(--border-strong)',
                  background: 'transparent',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  transition: 'all 0.2s',
                  opacity: isFiltered ? 1 : 0.6,
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
                style={{ fontSize: '0.75rem', padding: '0.4rem 1rem' }}
                title="No matches found for you"
              >
                <User size={16} /> No Matches
              </button>
            )
          ) : (
            <button onClick={() => navigate(`/signup?returnTo=/gallery/${accessLink}`)} className="btn-primary" style={{ fontSize: '0.78rem' }}>
              <User size={16} /> Sign In to Find Your Face
            </button>
          )}
          
          <button 
            onClick={downloadAll} 
            disabled={downloading || displayedPhotos.length === 0}
            className="btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.5rem 1rem' }}
          >
            {downloading ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
            {downloading ? "Zipping..." : "↓ Download All"}
          </button>
        </div>
      </div>

      {/* No face profile banner */}
      {noFaceProfile && (
        <div style={{
          background: 'rgba(201,169,110,0.06)',
          border: '1px solid rgba(201,169,110,0.25)',
          padding: '14px 20px',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <p style={{ margin: 0, color: 'var(--gold)', fontSize: '0.85rem', fontWeight: 400 }}>
            Your account has no face profile. Complete setup to enable AI face sorting.
          </p>
          <button
            onClick={() => navigate(`/signup?returnTo=/gallery/${accessLink}`)}
            className="btn-primary"
            style={{ fontSize: '0.75rem', padding: '0.4rem 1rem' }}
          >
            Complete Profile →
          </button>
        </div>
      )}

      {/* DISTINCT FACES TRAY */}
      {galleryFaces.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <div className="panel-label" style={{ marginBottom: '1rem' }}>Faces in this Gallery</div>
          <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '8px' }}>
            {galleryFaces.map((f, idx) => {
              // f.bounding_box is [top, right, bottom, left]
              let avatarSrc = f.avatar_url;
              if (f.bounding_box && f.avatar_url.includes('/upload/')) {
                  const [top, right, bottom, left] = f.bounding_box;
                  const w = right - left;
                  const h = bottom - top;
                  // Use precise coordinates for user-uploaded photos
                  avatarSrc = f.avatar_url.replace('/upload/', `/upload/c_crop,x_${Math.max(0, left)},y_${Math.max(0, top)},w_${w},h_${h}/w_100,h_100,c_fill/`);
              } else if (f.avatar_url.includes('/upload/')) {
                  // Fallback to Cloudinary AI Face Detection (perfect for clean portraits/samples)
                  avatarSrc = f.avatar_url.replace('/upload/', '/upload/c_thumb,g_face,w_100,h_100,q_auto/');
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
                          gap: '6px',
                          flexShrink: 0,
                          opacity: (selectedFaceUrl && !isSelected) ? 0.35 : 1,
                          transition: 'opacity 0.2s'
                      }}
                  >
                      <img 
                          src={avatarSrc} 
                          alt="Face" 
                          style={{
                              width: '56px', 
                              height: '56px', 
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: isSelected ? '2px solid var(--gold)' : '1px solid var(--border-strong)',
                              transition: 'border-color 0.2s'
                          }}
                      />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.04em' }}>{f.count} photos</span>
                  </div>
              );
            })}
          </div>
        </div>
      )}


      {displayedPhotos.length === 0 ? (
        <div className="gallery-empty">
          <div className="empty-illustration">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <rect x="10" y="20" width="60" height="48" rx="2" stroke="#c9a96e" strokeWidth="1.2"/>
              <circle cx="28" cy="36" r="6" stroke="#c9a96e" strokeWidth="1"/>
              <path d="M10 56l18-14 14 10 10-8 18 12" stroke="#c9a96e" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="58" cy="14" r="8" fill="none" stroke="#c9a96e" strokeWidth="1" strokeDasharray="2 2"/>
              <path d="M58 10v8M54 14h8" stroke="#c9a96e" strokeWidth="1" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="empty-title">
            {isFiltered ? "No face matches found" : "This gallery is empty"}
          </div>
          <div className="empty-sub">
            {isFiltered 
              ? "AI couldn't find your face in this album. Try showing all photos instead."
              : "Upload photos to begin AI face matching. Guests can find themselves instantly via the shared link."}
          </div>
          {isFiltered && (
            <button onClick={() => setIsFiltered(false)} className="btn-primary" style={{ marginTop: '1.8rem', fontSize: '0.82rem' }}>
              Show All Photos
            </button>
          )}
        </div>
      ) : (
        <div className="insta-grid">
          {displayedPhotos.map((photo) => {
            // Display a smaller, optimized version for the gallery grid
            const displayUrl = photo.url.includes('/upload/') 
               ? photo.url.replace('/upload/', '/upload/c_fill,w_500,h_500,q_auto/') 
               : photo.url;
               
            return (
              <div key={photo.id} className="insta-item">
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
