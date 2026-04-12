import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, Loader2, CheckCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Subscription() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [qrUrl, setQrUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null); // 'pending' or null

  useEffect(() => {
    if (!token) {
        navigate('/signup');
        return;
    }
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const [qrRes, statusRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/subscription/qr`),
        axios.get(`${API_BASE_URL}/subscription/status`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setQrUrl(qrRes.data.qr_url);
      if (statusRes.data.has_pending_request) {
        setStatus('pending');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      if (!cloudName) throw new Error("Cloudinary missing");

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'ml_default');

      const cResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const cData = await cResponse.json();
      if (!cResponse.ok) throw new Error("Cloudinary upload failed");

      setScreenshotUrl(cData.secure_url);
    } catch (err) {
      console.error(err);
      alert("Failed to upload screenshot.");
    } finally {
      setUploading(false);
    }
  };

  const submitRequest = async () => {
    if (!screenshotUrl) return;
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/subscription/request`, {
        screenshot_url: screenshotUrl,
        requested_folders: 1 // hardcoded to 1 for now
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus('pending');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !qrUrl && !status) return (
    <div className="container py-2xl text-center">
      <Loader2 className="animate-spin" size={28} style={{ color: 'var(--gold)', margin: '0 auto' }} />
    </div>
  );

  return (
    <div className="container animate-fade-in flex flex-col items-center" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div className="glass-panel" style={{ maxWidth: '520px', width: '100%', textAlign: 'center' }}>
        <div className="auth-eyebrow">Subscription</div>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.9rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.6rem', lineHeight: 1.2 }}>
          Upgrade Your Plan
        </h2>
        
        {status === 'pending' ? (
          <div style={{ padding: '3rem 1rem' }}>
             <CheckCircle size={40} color="#22c55e" style={{ margin: '0 auto 12px' }} />
             <h3 style={{ color: '#22c55e', fontSize: '1.1rem', fontWeight: 500, marginBottom: '0.8rem' }}>Request Pending</h3>
             <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 300, lineHeight: 1.7 }}>
               Your payment verification is in progress. The admin will verify your screenshot and increase your folder limits soon.
             </p>
             <button onClick={() => navigate('/')} className="btn-secondary" style={{ marginTop: '1.5rem' }}>Return to Dashboard</button>
          </div>
        ) : (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 300, lineHeight: 1.7, marginBottom: '2.5rem' }}>
              Get more folders to store your event photos. ₹50 per folder, with a limit of 200 photos per folder.
            </p>
            
            {qrUrl ? (
              <div style={{ marginBottom: '2.5rem' }}>
                <img src={qrUrl} alt="Payment QR" style={{ width: '220px', height: '220px', margin: '0 auto', display: 'block' }} />
                <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '1rem', letterSpacing: '0.05em' }}>Scan QR to pay</p>
              </div>
            ) : (
              <div style={{ padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ margin: '0 auto 12px' }}>
                  <rect x="6" y="6" width="14" height="14" rx="1" stroke="#c9a96e" strokeWidth="1.2"/>
                  <rect x="28" y="6" width="14" height="14" rx="1" stroke="#c9a96e" strokeWidth="1.2"/>
                  <rect x="6" y="28" width="14" height="14" rx="1" stroke="#c9a96e" strokeWidth="1.2"/>
                  <rect x="30" y="30" width="4" height="4" fill="#c9a96e" opacity="0.4"/>
                  <rect x="38" y="30" width="4" height="4" fill="#c9a96e" opacity="0.4"/>
                  <rect x="30" y="38" width="4" height="4" fill="#c9a96e" opacity="0.4"/>
                </svg>
                <p style={{ fontSize: '0.85rem' }}>No payment QR code is set up yet.</p>
              </div>
            )}

            {qrUrl && (
              <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                <div className="panel-label">Upload Payment Screenshot</div>
                {!screenshotUrl ? (
                  <div>
                    <input type="file" id="screenshot-upload" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                    <label htmlFor="screenshot-upload" className="btn-secondary cursor-pointer" style={{ display: 'inline-flex', justifyContent: 'center', maxWidth: '280px', margin: '0 auto' }}>
                      {uploading ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
                      {uploading ? 'Uploading...' : 'Choose Screenshot'}
                    </label>
                  </div>
                ) : (
                  <div>
                    <img src={screenshotUrl} alt="Screenshot" style={{ height: '60px', margin: '0 auto 12px', display: 'block' }} />
                    <button onClick={submitRequest} className="btn-primary" style={{ display: 'flex', justifyContent: 'center', maxWidth: '280px', margin: '0 auto' }} disabled={loading}>
                       {loading ? <Loader2 className="animate-spin" size={16} /> : 'Submit for Verification'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
