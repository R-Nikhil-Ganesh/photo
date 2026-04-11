import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, Link, useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './App.css'; 

import UploadGallery from './components/UploadGallery';
import GalleryDashboard from './components/GalleryDashboard';
import GalleryView from './components/GalleryView';
import SignupFlow from './components/SignupFlow';

// Load your real Google Client ID
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function GalleryRoute() {
  return <GalleryView />;
}

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
          <button onClick={() => navigate('/signup')} className="btn-primary">Sign In / Setup AI</button>
        )}
      </div>
    </nav>
  );
}

function Home() {
  const { token } = useAuth();
  const navigate = useNavigate();

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
              <button onClick={() => navigate('/signup')} className="btn-primary">
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
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken) setToken(savedToken);
    if (savedUser) setUser(savedUser ? JSON.parse(savedUser) : null);
  }, []);

  const login = (userData, userToken) => {
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setToken(userToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    window.location.href = '/';
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthContext.Provider value={{ user, token, login, logout }}>
        <Router>
          <Navigation />
          <div className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/signup" element={<SignupFlow />} />
              <Route path="/gallery/:accessLink" element={<GalleryRoute />} />
            </Routes>
          </div>
        </Router>
      </AuthContext.Provider>
    </GoogleOAuthProvider>
  );
}

export default App;
