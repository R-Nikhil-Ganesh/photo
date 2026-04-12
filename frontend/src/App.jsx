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
          Fr<span className="nav-logo-accent">a</span>my
        </Link>
        <div className="nav-actions">
          {token ? (
            <>
              <span className="nav-user">{user?.name}</span>
              <button onClick={() => navigate('/signup?mode=update')} className="btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.75rem' }}>
                 Update Face
              </button>
              <button onClick={logout} className="btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.75rem' }}>
                 Logout
              </button>
            </>
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
          <div className="hero-tag">AI-Powered Photo Sharing</div>
          <h1 className="hero-title">
            Every moment,<br /><em>perfectly shared.</em>
          </h1>
          <p className="hero-subtitle">
            A refined photo sharing engine built for events, weddings, and high-end portfolios. Face recognition included.
          </p>
          <div className="flex justify-center gap-md">
            <button onClick={() => navigate('/signup')} className="btn-primary" style={{ padding: '0.85rem 2.2rem', fontSize: '0.88rem' }}>
              Get Started
            </button>
            <button onClick={handleViewExample} className="btn-ghost" style={{ padding: '0.85rem 2.2rem', fontSize: '0.88rem' }}>
              View Example
            </button>
          </div>
          
          <div className="hero-features">
            <div className="feature-item">
              <div className="feat-num">01</div>
              <h4>Face Recognition</h4>
              <p>Secure client-side AI mapping for instant retrieval. Never scroll through thousands of photos again.</p>
            </div>
            <div className="feature-item">
              <div className="feat-num">02</div>
              <h4>Private Galleries</h4>
              <p>Encrypted event folders with controlled public access. Fast, simple guest links.</p>
            </div>
            <div className="feature-item">
              <div className="feat-num">03</div>
              <h4>Bulk Archiving</h4>
              <p>High-speed processing and one-click ZIP generation. Deliver client matches instantly.</p>
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
