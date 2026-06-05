import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './App.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import GalleryDashboard from './components/GalleryDashboard';
import GalleryView from './components/GalleryView';
import SignupFlow from './components/SignupFlow';
import Subscription from './components/Subscription';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import LandingPage from './components/LandingPage';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'placeholder-google-client-id.apps.googleusercontent.com';

if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
  console.warn("Warning: VITE_GOOGLE_CLIENT_ID environment variable is missing. Google Login features will not work until this is configured in Vercel settings.");
}


// The top-nav is only shown on pages that aren't the dashboard.
// The dashboard has its own sidebar + full-page layout.
function Navigation() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const location = useLocation();

  // Hide the global nav when the user is on "/" and authenticated
  // (GalleryDashboard renders its own sidebar navigation)
  const isDashboard = token && location.pathname === '/';
  if (isDashboard) return null;

  return (
    <nav className="nav-container">
      <div className="nav-inner">
        <Link to="/" className="nav-logo">
          Fr<span className="nav-logo-accent">a</span>my
        </Link>
        <div className="nav-actions">
          {token ? (
            <>
              <span className="nav-user" title={user?.name}>{user?.name}</span>
              <button
                onClick={() => navigate('/signup?mode=update')}
                className="btn-secondary nav-button"
              >
                Update Face
              </button>
              <button onClick={logout} className="btn-secondary nav-button">
                Logout
              </button>
            </>
          ) : (
            <button onClick={() => navigate('/signup')} className="btn-primary nav-button">
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

function Home() {
  const { token, loading } = useAuth();
  if (loading) return null;
  return token ? <GalleryDashboard /> : <LandingPage />;
}

// Wrap children in main-content padding, but not when it's the dashboard
function ContentWrapper({ children }) {
  const { token } = useAuth();
  const location = useLocation();
  const isDashboard = token && location.pathname === '/';
  if (isDashboard) return <>{children}</>;
  return <div className="main-content">{children}</div>;
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <Router>
          <Navigation />
          <ContentWrapper>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/signup" element={<SignupFlow />} />
              <Route path="/gallery/:accessLink" element={<GalleryView />} />
              <Route path="/subscribe" element={<Subscription />} />
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
            </Routes>
          </ContentWrapper>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
