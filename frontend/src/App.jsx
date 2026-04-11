import React from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, Link, useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import UploadGallery from './components/UploadGallery';
import FindMeCapture from './components/FindMeCapture';
import SignupFlow from './components/SignupFlow';

// Put your real Google Client ID from Google Cloud Console here
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

function GalleryRoute() {
  const { accessLink } = useParams();
  return <FindMeCapture accessLink={accessLink} />;
}

function Navigation() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  };

  return (
    <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 'var(--spacing-xl)', paddingRight: 'var(--spacing-xl)' }}>
      <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
        <h1 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }} className="text-gradient">
          Find Me 📸
        </h1>
      </Link>
      <div>
        {token ? (
          <div className="flex items-center gap-md">
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Welcome, {user?.name}</span>
            <button onClick={logout} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.875rem' }}>Logout</button>
          </div>
        ) : (
          <button onClick={() => navigate('/signup')} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.875rem' }}>Sign In / Setup AI</button>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <Navigation />
        <main>
          <Routes>
            <Route path="/" element={<UploadGallery />} />
            <Route path="/signup" element={<SignupFlow />} />
            <Route path="/gallery/:accessLink" element={<GalleryRoute />} />
          </Routes>
        </main>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
