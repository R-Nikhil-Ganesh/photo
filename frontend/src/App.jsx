import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './App.css'; 

import { AuthProvider, useAuth } from './context/AuthContext';
import UploadGallery from './components/UploadGallery';
import GalleryDashboard from './components/GalleryDashboard';
import GalleryView from './components/GalleryView';
import SignupFlow from './components/SignupFlow';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function Navigation() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();

  return (
    <nav className="nav-container">
      <Link to="/" className="nav-logo">
        Find Me <span className="logo-icon">📸</span>
      </Link>
      <div className="nav-actions">
        {token ? (
          <div className="user-profile">
            <span className="user-name">Hello, {user?.name?.split(' ')[0]}</span>
            <button onClick={logout} className="btn-secondary">Logout</button>
          </div>
        ) : (
          <button onClick={() => navigate('/signup')} className="btn-primary">Sign In</button>
        )}
      </div>
    </nav>
  );
}

function Home() {
  const { token, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;

  return (
    <div className="hero-section animate-fade-in">
      <div className="hero-content">
        <div className="hero-text-wrapper">
          <h1 className="hero-title text-gradient">Never Search for Your Photos Again.</h1>
          <p className="hero-subtitle">
            The smart group photo sharing app that uses AI to find you in every album automatically.
          </p>
        </div>
        
        <div className="hero-actions">
          {token ? (
            <div className="logged-in-action">
              <GalleryDashboard />
            </div>
          ) : (
            <div className="logged-out-action">
              <button onClick={() => navigate('/signup')} className="btn-primary hero-btn">
                Join Now for AI Matching
              </button>
              <p className="mt-md text-muted">Already have a link? Sign in to view your photos.</p>
            </div>
          )}
        </div>
      </div>
      
      {!token && (
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h4>AI Face Mapping</h4>
            <p>Secure, client-side face recognition that respects your privacy.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h4>Instant Search</h4>
            <p>Find your photos across thousands of images in milliseconds.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📦</div>
            <h4>Auto Zip</h4>
            <p>Download all your verified photos in one neat package.</p>
          </div>
        </div>
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
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
