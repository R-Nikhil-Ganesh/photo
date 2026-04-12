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
    <div className="animate-fade-in">
      {!token ? (
        <section className="hero-section">
          <h1 className="hero-title text-gradient">Smart Sharing for Every Moment.</h1>
          <p className="hero-subtitle">
            A minimalist, AI-powered photo sharing engine designed for events, weddings, and high-end portfolios.
          </p>
          <div className="flex justify-center gap-md">
            <button onClick={() => navigate('/signup')} className="btn-primary">
              Get Started
            </button>
            <button className="btn-secondary">
              View Example
            </button>
          </div>
          
          <div className="grid md:grid-cols-3 gap-lg mt-2xl pt-xl border-t border-glass">
            <div className="feature-item">
              <h4 className="mb-xs">Face Recognition</h4>
              <p className="text-sm text-dim">Secure client-side AI mapping for instant retrieval.</p>
            </div>
            <div className="feature-item">
              <h4 className="mb-xs">Private Galleries</h4>
              <p className="text-sm text-dim">Encrypted event folders with controlled public access.</p>
            </div>
            <div className="feature-item">
              <h4 className="mb-xs">Bulk Archiving</h4>
              <p className="text-sm text-dim">High-speed processing and one-click ZIP generation.</p>
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
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
