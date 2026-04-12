import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, Loader2, CheckCircle, Check } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    folders: 1,
    price: 50,
    features: ['1 event folder', 'Up to 200 photos', 'AI face matching', 'Shareable guest link'],
    popular: false,
  },
  {
    id: 'starter',
    name: 'Starter',
    folders: 2,
    price: 120,
    features: ['2 event folders', 'Up to 200 photos each', 'AI face matching', 'Shareable guest links'],
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    folders: 5,
    price: 299,
    features: ['5 event folders', 'Up to 200 photos each', 'AI face matching', 'Shareable guest links', 'Priority support'],
    popular: true,
  },
  {
    id: 'studio',
    name: 'Studio',
    folders: 15,
    price: 799,
    features: ['15 event folders', 'Up to 200 photos each', 'AI face matching', 'Shareable guest links', 'Bulk ZIP downloads', 'Priority support'],
    popular: false,
  },
];

export default function Subscription() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [qrUrl, setQrUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(PLANS[0]); // default to Starter (₹120)
  const [step, setStep] = useState('choose'); // 'choose' | 'pay'

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
        requested_folders: selectedPlan.folders
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
    <div className="container animate-fade-in" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div className="auth-eyebrow" style={{ justifyContent: 'center' }}>Pricing</div>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.6rem', lineHeight: 1.2 }}>
          Choose Your Plan
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', fontWeight: 300, lineHeight: 1.7, maxWidth: '480px', margin: '0 auto' }}>
          Unlock more event folders with AI-powered face matching. Pay once, keep your folders forever.
        </p>
      </div>

      {status === 'pending' ? (
        <div className="glass-panel" style={{ maxWidth: '520px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ padding: '3rem 1rem' }}>
             <CheckCircle size={40} color="#22c55e" style={{ margin: '0 auto 12px' }} />
             <h3 style={{ color: '#22c55e', fontSize: '1.1rem', fontWeight: 500, marginBottom: '0.8rem' }}>Request Pending</h3>
             <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 300, lineHeight: 1.7 }}>
               Your payment for the <strong style={{ color: 'var(--gold)' }}>{selectedPlan.name}</strong> plan is being verified.
               The admin will confirm your screenshot and unlock your folders soon.
             </p>
             <button onClick={() => navigate('/')} className="btn-secondary" style={{ marginTop: '1.5rem' }}>Return to Dashboard</button>
          </div>
        </div>
      ) : step === 'choose' ? (
        /* ── PLAN SELECTION ── */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.05)',
          maxWidth: '900px',
          margin: '0 auto',
        }}>
          {PLANS.map(plan => {
            const isSelected = selectedPlan.id === plan.id;
            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan)}
                style={{
                  background: 'var(--bg)',
                  padding: '2.5rem 2rem',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s',
                  ...(isSelected && { background: 'rgba(201,169,110,0.04)' }),
                }}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    background: 'var(--gold)',
                    color: '#050508',
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    padding: '3px 8px',
                  }}>
                    Popular
                  </div>
                )}

                {/* Selection indicator */}
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: isSelected ? '2px solid var(--gold)' : '1px solid var(--border-strong)',
                  borderRadius: '50%',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}>
                  {isSelected && (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--gold)' }} />
                  )}
                </div>

                {/* Plan name */}
                <div style={{
                  fontSize: '0.7rem',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: isSelected ? 'rgba(201,169,110,0.7)' : 'var(--text-dim)',
                  marginBottom: '0.8rem',
                }}>
                  {plan.name}
                </div>

                {/* Price */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '1.5rem' }}>
                  <span style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '2.2rem',
                    fontWeight: 700,
                    color: isSelected ? 'var(--gold)' : 'var(--text)',
                    lineHeight: 1,
                  }}>
                    ₹{plan.price}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 300 }}>
                    one-time
                  </span>
                </div>

                {/* Features */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {plan.features.map((feat, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Check size={14} style={{ color: isSelected ? 'var(--gold)' : 'var(--text-dim)', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 300 }}>{feat}</span>
                    </div>
                  ))}
                </div>

                {/* Hover gold line at bottom */}
                <div style={{
                  position: 'absolute',
                  bottom: 0, left: 0, right: 0,
                  height: '1px',
                  background: isSelected
                    ? 'linear-gradient(90deg, transparent, rgba(201,169,110,0.5), transparent)'
                    : 'transparent',
                  transition: 'background 0.3s',
                }} />
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Continue / Pay button below plans */}
      {step === 'choose' && !status && (
        <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <button
            className="btn-primary"
            onClick={() => setStep('pay')}
            style={{ padding: '0.85rem 3rem', fontSize: '0.88rem' }}
          >
            Continue with {selectedPlan.name} — ₹{selectedPlan.price}
          </button>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '1rem', letterSpacing: '0.04em' }}>
            {selectedPlan.folders} folder{selectedPlan.folders > 1 ? 's' : ''} · 200 photos each · AI face matching
          </p>
        </div>
      )}

      {/* ── PAYMENT STEP ── */}
      {step === 'pay' && !status && (
        <div className="glass-panel" style={{ maxWidth: '520px', margin: '2rem auto 0', textAlign: 'center' }}>
          {/* Selected plan summary */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.2rem',
            background: 'rgba(201,169,110,0.05)',
            border: '1px solid rgba(201,169,110,0.15)',
            marginBottom: '2rem',
          }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '2px' }}>
                Selected Plan
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text)' }}>
                {selectedPlan.name} — {selectedPlan.folders} folder{selectedPlan.folders > 1 ? 's' : ''}
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--gold)' }}>
              ₹{selectedPlan.price}
            </div>
          </div>

          <button
            className="btn-secondary"
            onClick={() => setStep('choose')}
            style={{ fontSize: '0.72rem', padding: '0.35rem 0.8rem', marginBottom: '1.5rem' }}
          >
            ← Change Plan
          </button>
            
          {qrUrl ? (
            <div style={{ marginBottom: '2rem' }}>
              <img src={qrUrl} alt="Payment QR" style={{ width: '200px', height: '200px', margin: '0 auto', display: 'block' }} />
              <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '1rem', letterSpacing: '0.05em' }}>
                Scan and pay ₹{selectedPlan.price}
              </p>
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
                     {loading ? <Loader2 className="animate-spin" size={16} /> : `Submit ₹${selectedPlan.price} Payment`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
