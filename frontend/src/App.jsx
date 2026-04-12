import React from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './App.css'; 

import { AuthProvider, useAuth } from './context/AuthContext';
import UploadGallery from './components/UploadGallery';
import GalleryDashboard from './components/GalleryDashboard';
import GalleryView from './components/GalleryView';
import SignupFlow from './components/SignupFlow';
import Subscription from './components/Subscription';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function Navigation() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();

  return (
    <nav className="nav-container">
      <div className="nav-inner">
        <Link to="/" className="nav-logo">
          Framy
        </Link>
        <div className="nav-actions">
          {token ? (
            <div className="flex items-center gap-md">
              <span className="text-xs text-muted">HELLO, {user?.name?.toUpperCase()}</span>
              <button onClick={() => navigate('/signup?mode=update')} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                 Update Face
              </button>
              <button onClick={logout} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                 Logout
              </button>
            </div>
          ) : (
            <button onClick={() => navigate('/signup')} className="btn-primary">Sign In</button>
          )}
        </div>
      </div>
    </nav>
  );
}

function Home() {
  const { token, loading } = useAuth();
  const navigate = useNavigate();

  const handleViewExample = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await axios.post(`${API_URL}/samples/seed`);
      navigate(`/gallery/${res.data.access_link}`);
    } catch (err) {
      console.error(err);
      // Fallback if API fails
      navigate('/gallery/framy-demo-sample');
    }
  };

  if (loading) return null;

  return (
    <div className="animate-fade-in">
      {!token ? (
        <section className="hero-section">
          <h1 className="hero-title text-gradient">Smart Sharing for Every Moment.</h1>
          <p className="hero-subtitle text-muted">
            A minimalist, AI-powered photo sharing engine designed for events, weddings, and high-end portfolios.
          </p>
          <div className="flex justify-center gap-md">
            <button onClick={() => navigate('/signup')} className="btn-primary" style={{ padding: '12px 24px', fontSize: '1rem' }}>
              Get Started
            </button>
            <button onClick={handleViewExample} className="btn-secondary" style={{ padding: '12px 24px', fontSize: '1rem' }}>
              View Example
            </button>
          </div>
          
          <div className="hero-features">
            <div className="feature-item">
              <h4 className="mb-xs">Face Recognition</h4>
              <p className="text-sm text-dim">Secure client-side AI mapping for instant retrieval. Never scroll through 1000s of photos again.</p>
            </div>
            <div className="feature-item">
              <h4 className="mb-xs">Private Galleries</h4>
              <p className="text-sm text-dim">Encrypted event folders with controlled public access. Fast, simple guest links.</p>
            </div>
            <div className="feature-item">
              <h4 className="mb-xs">Bulk Archiving</h4>
              <p className="text-sm text-dim">High-speed processing and one-click ZIP generation for photographers to deliver clients their matches instantly.</p>
            </div>
          </div>
        </section>
      ) : (
        <GalleryDashboard />
      )}
    </div>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <Router>
          <Navigation />
          <div className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/signup" element={<SignupFlow />} />
              <Route path="/gallery/:accessLink" element={<GalleryView />} />
              <Route path="/subscribe" element={<Subscription />} />
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
