import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Download, Loader2, User, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function GalleryView() {
  const { accessLink } = useParams();
  const { token } = useAuth();
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
  const [selectedFaceUrl, setSelectedFaceUrl] = useState(null);
  const [myMatchedUrls, setMyMatchedUrls] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingText, setIsSearchingText] = useState(false);

  const handleTextSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setIsFiltered(false);
      setMatchedUrls([]);
      setSelectedFaceUrl(null);
      return;
    }

    setIsSearchingText(true);
    setSelectedFaceUrl(null); // Clear selected face avatar highlights when using text search
    try {
      const res = await axios.get(`${API_BASE_URL}/search/${accessLink}/text?q=${encodeURIComponent(searchQuery.trim())}`);
      setMatchedUrls(res.data.matched_urls);
      setIsFiltered(true);
    } catch (err) {
      console.error(err);
      alert('Failed to search photos.');
    } finally {
      setIsSearchingText(false);
    }
  };

  useEffect(() => {
    loadGalleryData();
  }, [accessLink, token]);

  const loadGalleryData = async () => {
    try {
      setLoading(true);
      setError(null);
      setNoFaceProfile(false);

      const galleryRes = await axios.get(`${API_BASE_URL}/gallery/public/${accessLink}`);
      setGalleryName(galleryRes.data.name);
      setAllPhotos(galleryRes.data.photos);

      if (token) {
        try {
          const searchRes = await axios.get(`${API_BASE_URL}/search/${accessLink}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const matches = searchRes.data.matched_public_ids;
          setMatchedUrls(matches);
          setMyMatchedUrls(matches);
          setIsFiltered(matches.length > 0);
        } catch (searchErr) {
          if (searchErr.response?.status === 400) {
            setNoFaceProfile(true);
          }
          console.error('Search failed, showing all photos', searchErr);
          setMatchedUrls([]);
          setMyMatchedUrls([]);
          setIsFiltered(false);
        }
      } else {
        setMatchedUrls([]);
        setMyMatchedUrls([]);
        setIsFiltered(false);
      }

      try {
        const facesRes = await axios.get(`${API_BASE_URL}/gallery/public/${accessLink}/faces`);
        setGalleryFaces(facesRes.data || []);
      } catch (facesErr) {
        console.error('Failed to load gallery faces', facesErr);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.status === 404 ? 'Gallery not found.' : 'Failed to load gallery.');
    } finally {
      setLoading(false);
    }
  };

  const displayedPhotos = isFiltered
    ? allPhotos.filter((photo) => matchedUrls.includes(photo.url))
    : allPhotos;

  const downloadAll = async () => {
    setDownloading(true);
    const zip = new JSZip();
    const folder = zip.folder(galleryName);

    try {
      await Promise.all(
        displayedPhotos.map(async (photo, index) => {
          const response = await fetch(photo.url);
          const blob = await response.blob();
          folder.file(`photo_${index + 1}.jpg`, blob);
        })
      );

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${galleryName}_photos.zip`);
    } catch (err) {
      console.error(err);
      alert('Failed to download photos.');
    } finally {
      setDownloading(false);
    }
  };

  const toggleMyPhotos = () => {
    if (!isFiltered) {
      setMatchedUrls(myMatchedUrls);
      setSelectedFaceUrl(null);
      setIsFiltered(true);
    } else {
      setIsFiltered(false);
      setSelectedFaceUrl(null);
    }
  };

  if (loading) {
    return (
      <div className="container flex flex-col items-center justify-center" style={{ minHeight: '80vh' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--gold)', marginBottom: '16px' }} />
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Opening {galleryName || 'gallery'}...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container text-center py-2xl">
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--text)', marginBottom: '1rem' }}>
          Gallery Not Found
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>{error}</p>
        <button onClick={() => navigate('/')} className="btn-primary">Return Home</button>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in" style={{ paddingTop: '1.5rem', paddingBottom: '3rem' }}>
      <div className="page-breadcrumb">
        <span
          className="bc-link"
          onClick={() => navigate('/')}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              navigate('/');
            }
          }}
        >
          Home
        </span>
        <span className="breadcrumb-sep">/</span>
        <span style={{ color: 'rgba(232, 228, 220, 0.7)' }}>{galleryName}</span>
      </div>

      <div className="page-header" style={{ borderBottom: 'none', paddingBottom: '1rem' }}>
        <div>
          <div className="page-eyebrow">Gallery</div>
          <h1 className="page-title">{galleryName}</h1>
          <div className="page-sub">
            {displayedPhotos.length} of {allPhotos.length} photos
            {isFiltered ? ' filtered by face' : ''}
          </div>
        </div>

        <div className="header-actions">
          {token ? (
            myMatchedUrls.length > 0 ? (
              <button
                onClick={toggleMyPhotos}
                title={isFiltered ? 'Show all photos' : 'Show my photos'}
                aria-label={isFiltered ? 'Show all photos' : 'Show my photos'}
                style={{
                  width: '46px',
                  height: '46px',
                  padding: 0,
                  borderRadius: '50%',
                  border: isFiltered ? '2px solid var(--gold)' : '1px solid var(--border-strong)',
                  background: 'transparent',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  opacity: isFiltered ? 1 : 0.72,
                }}
              >
                <img
                  src={myMatchedUrls[0].replace('/upload/', '/upload/c_thumb,g_face,w_100,h_100/')}
                  alt="My matched face"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </button>
            ) : (
              <button disabled className="btn-secondary" title="No matches found for you">
                <User size={16} /> No Matches
              </button>
            )
          ) : (
            <button
              onClick={() => navigate(`/signup?returnTo=/gallery/${accessLink}`)}
              className="btn-primary"
            >
              <User size={16} /> Sign In to Find Your Face
            </button>
          )}

          <button
            onClick={downloadAll}
            disabled={downloading || displayedPhotos.length === 0}
            className="btn-secondary"
          >
            {downloading ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
            {downloading ? 'Preparing Zip' : 'Download All'}
          </button>
        </div>
      </div>

      {noFaceProfile && (
        <div className="status-banner">
          <div className="status-banner-copy">
            <User size={18} />
            <p>Your account does not have a face profile yet. Finish setup to unlock AI sorting.</p>
          </div>
          <div className="status-banner-actions">
            <button
              onClick={() => navigate(`/signup?returnTo=/gallery/${accessLink}`)}
              className="btn-primary"
            >
              Complete Profile
            </button>
          </div>
        </div>
      )}

      {galleryFaces.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <div className="panel-label" style={{ marginBottom: '1rem' }}>Faces in this Gallery</div>
          <div className="face-rail">
            {galleryFaces.map((face, index) => {
              let avatarSrc = face.avatar_url;

              if (face.bounding_box && face.avatar_url.includes('/upload/')) {
                const [top, right, bottom, left] = face.bounding_box;
                const width = right - left;
                const height = bottom - top;
                avatarSrc = face.avatar_url.replace(
                  '/upload/',
                  `/upload/c_crop,x_${Math.max(0, left)},y_${Math.max(0, top)},w_${width},h_${height}/w_100,h_100,c_fill/`
                );
              } else if (face.avatar_url.includes('/upload/')) {
                avatarSrc = face.avatar_url.replace('/upload/', '/upload/c_thumb,g_face,w_100,h_100,q_auto/');
              }

              const isSelected = selectedFaceUrl === face.avatar_url;
              const isMuted = selectedFaceUrl && !isSelected;

              return (
                <button
                  key={index}
                  type="button"
                  className={`face-pill${isSelected ? ' is-selected' : ''}${isMuted ? ' is-muted' : ''}`}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedFaceUrl(null);
                      setIsFiltered(false);
                    } else {
                      setSelectedFaceUrl(face.avatar_url);
                      setMatchedUrls(face.matched_urls);
                      setIsFiltered(true);
                    }
                  }}
                  aria-pressed={isSelected}
                >
                  <img src={avatarSrc} alt={`Face group ${index + 1}`} />
                  <span className="face-pill-label">{face.count} photos</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Natural Language Text Search */}
      <div style={{ marginBottom: '2.5rem', maxWidth: '500px' }}>
        <div className="panel-label" style={{ marginBottom: '0.75rem' }}>Search by description (AI Tagging)</div>
        <form onSubmit={handleTextSearch} style={{ display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder="e.g. bride smiling, beach sunset, group photo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="db-input"
              style={{
                width: '100%',
                paddingLeft: '36px',
                height: '42px',
                borderRadius: '8px',
                border: '1px solid var(--border-strong)',
                background: 'rgba(255, 255, 255, 0.03)',
                color: 'var(--text)',
                fontSize: '0.9rem'
              }}
            />
            <Search 
              size={16} 
              style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: 'var(--text-muted)' 
              }} 
            />
          </div>
          <button 
            type="submit" 
            className="btn-primary" 
            style={{ height: '42px', padding: '0 20px', borderRadius: '8px' }}
            disabled={isSearchingText}
          >
            {isSearchingText ? <Loader2 className="animate-spin" size={16} /> : 'Search'}
          </button>
          {isFiltered && (
            <button
              type="button"
              className="btn-secondary"
              style={{ height: '42px', padding: '0 15px', borderRadius: '8px' }}
              onClick={() => {
                setSearchQuery('');
                setIsFiltered(false);
                setMatchedUrls([]);
                setSelectedFaceUrl(null);
              }}
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {displayedPhotos.length === 0 ? (
        <div className="gallery-empty">
          <div className="empty-illustration">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <rect x="10" y="20" width="60" height="48" rx="2" stroke="#c9a96e" strokeWidth="1.2" />
              <circle cx="28" cy="36" r="6" stroke="#c9a96e" strokeWidth="1" />
              <path d="M10 56l18-14 14 10 10-8 18 12" stroke="#c9a96e" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="58" cy="14" r="8" fill="none" stroke="#c9a96e" strokeWidth="1" strokeDasharray="2 2" />
              <path d="M58 10v8M54 14h8" stroke="#c9a96e" strokeWidth="1" strokeLinecap="round" />
            </svg>
          </div>
          <div className="empty-title">
            {isFiltered ? 'No face matches found' : 'This gallery is empty'}
          </div>
          <div className="empty-sub">
            {isFiltered
              ? 'We could not find a match for this face in the gallery yet. Try showing all photos instead.'
              : 'Upload photos to start face matching and guest delivery.'}
          </div>
          {isFiltered && (
            <button
              onClick={() => setIsFiltered(false)}
              className="btn-primary"
              style={{ marginTop: '1.8rem' }}
            >
              Show All Photos
            </button>
          )}
        </div>
      ) : (
        <div className="insta-grid">
          {displayedPhotos.map((photo) => {
            const displayUrl = photo.url.includes('/upload/')
              ? photo.url.replace('/upload/', '/upload/c_fill,w_500,h_500,q_auto/')
              : photo.url;

            return (
              <div key={photo.id} className="insta-item">
                <img src={displayUrl} alt="Event moment" className="gallery-img" loading="lazy" />
                <div className="insta-overlay">
                  <button
                    onClick={() => saveAs(photo.url, 'photo.jpg')}
                    title="Download high resolution photo"
                    className="btn-download-premium"
                  >
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
