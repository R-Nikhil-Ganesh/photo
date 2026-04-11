import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import PhotoResults from './PhotoResults';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function GalleryView() {
  const { accessLink } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [matchedUrls, setMatchedUrls] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMatches = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        // Not logged in! Redirect to signup and pass the return URL
        navigate(`/signup?returnTo=/gallery/${accessLink}`);
        return;
      }

      try {
        const response = await axios.get(`${API_BASE_URL}/search/${accessLink}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMatchedUrls(response.data.matched_public_ids); // Now contains raw URLs from backend
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.detail || "An error occurred finding your photos.");
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [accessLink, navigate]);

  if (loading) {
    return (
      <div className="container flex flex-col items-center justify-center" style={{ minHeight: '80vh' }}>
        <Loader2 className="animate-spin mb-md" size={48} color="var(--primary)" />
        <p>Searching for your beautiful face...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container text-center" style={{ minHeight: '80vh', paddingTop: '10vh' }}>
        <h2 style={{ color: '#ef4444' }}>Oops!</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/')} className="btn-secondary mt-lg">Go Home</button>
      </div>
    );
  }

  return <PhotoResults matchedUrls={matchedUrls} />;
}
