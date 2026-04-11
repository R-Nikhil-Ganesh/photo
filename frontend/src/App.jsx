import React from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, Link } from 'react-router-dom';
import UploadGallery from './components/UploadGallery';
import FindMeCapture from './components/FindMeCapture';

function GalleryRoute() {
  const { accessLink } = useParams();
  return <FindMeCapture accessLink={accessLink} />;
}

function App() {
  return (
    <Router>
      <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 'var(--spacing-xl)', paddingRight: 'var(--spacing-xl)' }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h1 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }} className="text-gradient">
            Find Me 📸
          </h1>
        </Link>
      </div>
      
      <main>
        <Routes>
          <Route path="/" element={<UploadGallery />} />
          <Route path="/gallery/:accessLink" element={<GalleryRoute />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
