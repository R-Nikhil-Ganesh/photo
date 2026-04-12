import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { QrCode, UploadCloud, Loader2, CheckCircle } from 'lucide-react';

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

  if (loading && !qrUrl && !status) return <div className="container py-2xl text-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="container py-xl animate-fade-in flex flex-col items-center">
      <div className="glass-panel" style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
        <h2 className="text-gradient">Premium Subscription</h2>
        
        {status === 'pending' ? (
          <div className="py-xl">
             <CheckCircle size={48} color="#10b981" style={{ margin: '0 auto var(--spacing-sm)' }} />
             <h3 style={{ color: '#10b981' }}>Request Pending</h3>
             <p className="text-muted">Your payment verification is in progress. The admin will verify your screenshot and increase your folder limits soon.</p>
             <button onClick={() => navigate('/')} className="btn-secondary mt-md">Return to Dashboard</button>
          </div>
        ) : (
          <>
            <p className="mb-lg">Get more folders to store your event photos! 50 (currency) per folder. Limit of 200 photos per folder.</p>
            
            {qrUrl ? (
              <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                <img src={qrUrl} alt="Payment QR" style={{ width: '250px', height: '250px', margin: '0 auto', borderRadius: 'var(--radius-md)' }} />
                <p className="text-sm text-dim mt-sm">Scan QR to pay</p>
              </div>
            ) : (
              <div className="py-xl text-muted flex flex-col items-center">
                <QrCode size={48} />
                <p>No payment QR code is set up yet.</p>
              </div>
            )}

            {qrUrl && (
              <div style={{ padding: 'var(--spacing-md)', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
                <h4 className="mb-sm text-sm">Upload Payment Screenshot</h4>
                {!screenshotUrl ? (
                  <div>
                    <input type="file" id="screenshot-upload" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                    <label htmlFor="screenshot-upload" className="btn-secondary flex items-center justify-center gap-sm cursor-pointer mx-auto" style={{ maxWidth: '280px' }}>
                      {uploading ? <Loader2 className="animate-spin" /> : <UploadCloud size={18} />}
                      {uploading ? 'Uploading...' : 'Choose Screenshot'}
                    </label>
                  </div>
                ) : (
                  <div>
                    <img src={screenshotUrl} alt="Screenshot" style={{ height: '60px', margin: '0 auto var(--spacing-sm)', borderRadius: 'var(--radius-sm)' }} />
                    <button onClick={submitRequest} className="btn-primary flex items-center justify-center mx-auto" disabled={loading} style={{ maxWidth: '280px' }}>
                       {loading ? <Loader2 className="animate-spin" /> : 'Submit for Verification'}
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
