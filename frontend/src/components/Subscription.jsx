import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Check, CheckCircle, Loader2, UploadCloud } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    folders: 1,
    price: 50,
    features: ['1 event collection', 'Up to 200 photos', 'AI face matching', 'Shareable guest link'],
    popular: false,
  },
  {
    id: 'starter',
    name: 'Starter',
    folders: 2,
    price: 120,
    features: ['2 event collections', 'Up to 200 photos each', 'AI face matching', 'Shareable guest links'],
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    folders: 5,
    price: 299,
    features: ['5 event collections', 'Up to 200 photos each', 'AI face matching', 'Shareable guest links', 'Priority support'],
    popular: true,
  },
  {
    id: 'studio',
    name: 'Studio',
    folders: 15,
    price: 799,
    features: ['15 event collections', 'Up to 200 photos each', 'AI face matching', 'Shareable guest links', 'Bulk zip downloads', 'Priority support'],
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
  const [selectedPlan, setSelectedPlan] = useState(PLANS[0]);
  const [step, setStep] = useState('choose');

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
        axios.get(`${API_BASE_URL}/subscription/status`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
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

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      if (!cloudName) throw new Error('Cloudinary missing');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'ml_default');

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error('Cloudinary upload failed');

      setScreenshotUrl(data.secure_url);
    } catch (err) {
      console.error(err);
      alert('Failed to upload screenshot.');
    } finally {
      setUploading(false);
    }
  };

  const submitRequest = async () => {
    if (!screenshotUrl) return;
    setLoading(true);
    try {
      await axios.post(
        `${API_BASE_URL}/subscription/request`,
        {
          screenshot_url: screenshotUrl,
          requested_folders: selectedPlan.folders,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setStatus('pending');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to submit request.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !qrUrl && !status) {
    return (
      <div className="container py-2xl text-center">
        <Loader2 className="animate-spin" size={28} style={{ color: 'var(--gold)', margin: '0 auto' }} />
      </div>
    );
  }

  return (
    <div className="container animate-fade-in" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div className="auth-eyebrow" style={{ justifyContent: 'center' }}>Pricing</div>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.6rem', lineHeight: 1.1 }}>
          Choose Your Plan
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.7, maxWidth: '560px', margin: '0 auto' }}>
          Unlock more event collections with AI-powered face matching, guest delivery, and simple payment verification.
        </p>
      </div>

      {status === 'pending' ? (
        <div className="glass-panel" style={{ maxWidth: '520px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ padding: '3rem 1rem' }}>
            <CheckCircle size={40} color="#22c55e" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ color: '#22c55e', fontSize: '1.1rem', fontWeight: 500, marginBottom: '0.8rem' }}>
              Request Pending
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.7 }}>
              Your payment for the <strong style={{ color: 'var(--gold)' }}>{selectedPlan.name}</strong> plan is being verified.
              We will unlock the extra collections as soon as the screenshot is confirmed.
            </p>
            <button onClick={() => navigate('/')} className="btn-secondary" style={{ marginTop: '1.5rem' }}>
              Return to Dashboard
            </button>
          </div>
        </div>
      ) : step === 'choose' ? (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '14px',
              maxWidth: '980px',
              margin: '0 auto',
            }}
          >
            {PLANS.map((plan) => {
              const isSelected = selectedPlan.id === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(plan)}
                  aria-pressed={isSelected}
                  style={{
                    textAlign: 'left',
                    border: `1px solid ${isSelected ? 'rgba(201, 169, 110, 0.34)' : 'var(--border)'}`,
                    background: isSelected ? 'rgba(201, 169, 110, 0.08)' : 'rgba(255,255,255,0.02)',
                    borderRadius: '22px',
                    padding: '24px',
                    cursor: 'pointer',
                    position: 'relative',
                    color: 'var(--text)',
                  }}
                >
                  {plan.popular && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        background: 'var(--gold)',
                        color: '#050508',
                        fontSize: '0.64rem',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        padding: '4px 8px',
                        borderRadius: '999px',
                      }}
                    >
                      Popular
                    </span>
                  )}

                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      border: isSelected ? '2px solid var(--gold)' : '1px solid var(--border-strong)',
                      borderRadius: '50%',
                      marginBottom: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isSelected && (
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--gold)' }} />
                    )}
                  </div>

                  <div style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: isSelected ? 'rgba(201, 169, 110, 0.84)' : 'var(--text-dim)', marginBottom: '0.8rem' }}>
                    {plan.name}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '1.2rem' }}>
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', fontWeight: 700, color: isSelected ? 'var(--gold)' : 'var(--text)', lineHeight: 1 }}>
                      Rs {plan.price}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>one-time</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {plan.features.map((feature, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Check size={14} style={{ color: isSelected ? 'var(--gold)' : 'var(--text-dim)', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{feature}</span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <button
              className="btn-primary"
              onClick={() => setStep('pay')}
              style={{ paddingLeft: '2rem', paddingRight: '2rem' }}
            >
              Continue with {selectedPlan.name} - Rs {selectedPlan.price}
            </button>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '1rem', letterSpacing: '0.04em' }}>
              {selectedPlan.folders} collection{selectedPlan.folders > 1 ? 's' : ''}. 200 photos each. AI face matching included.
            </p>
          </div>
        </>
      ) : null}

      {step === 'pay' && !status && (
        <div className="glass-panel" style={{ maxWidth: '560px', margin: '2rem auto 0', textAlign: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              padding: '1rem 1.2rem',
              background: 'rgba(201, 169, 110, 0.05)',
              border: '1px solid rgba(201, 169, 110, 0.15)',
              borderRadius: '18px',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '2px' }}>
                Selected Plan
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text)' }}>
                {selectedPlan.name} - {selectedPlan.folders} collection{selectedPlan.folders > 1 ? 's' : ''}
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--gold)' }}>
              Rs {selectedPlan.price}
            </div>
          </div>

          <button
            className="btn-secondary"
            onClick={() => setStep('choose')}
            style={{ marginBottom: '1.5rem' }}
          >
            Change Plan
          </button>

          {qrUrl ? (
            <div style={{ marginBottom: '2rem' }}>
              <img src={qrUrl} alt="Payment QR" style={{ width: '200px', height: '200px', margin: '0 auto', display: 'block' }} />
              <p style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginTop: '1rem', letterSpacing: '0.05em' }}>
                Scan to pay Rs {selectedPlan.price}
              </p>
            </div>
          ) : (
            <div style={{ padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ margin: '0 auto 12px' }}>
                <rect x="6" y="6" width="14" height="14" rx="1" stroke="#c9a96e" strokeWidth="1.2" />
                <rect x="28" y="6" width="14" height="14" rx="1" stroke="#c9a96e" strokeWidth="1.2" />
                <rect x="6" y="28" width="14" height="14" rx="1" stroke="#c9a96e" strokeWidth="1.2" />
                <rect x="30" y="30" width="4" height="4" fill="#c9a96e" opacity="0.4" />
                <rect x="38" y="30" width="4" height="4" fill="#c9a96e" opacity="0.4" />
                <rect x="30" y="38" width="4" height="4" fill="#c9a96e" opacity="0.4" />
              </svg>
              <p style={{ fontSize: '0.85rem' }}>No payment QR code is set up yet.</p>
            </div>
          )}

          {qrUrl && (
            <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '18px' }}>
              <div className="panel-label">Upload Payment Screenshot</div>
              {!screenshotUrl ? (
                <div>
                  <input
                    type="file"
                    id="screenshot-upload"
                    accept="image/*"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <label
                    htmlFor="screenshot-upload"
                    className="btn-secondary cursor-pointer"
                    style={{ display: 'inline-flex', justifyContent: 'center', maxWidth: '280px', margin: '0 auto' }}
                  >
                    {uploading ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
                    {uploading ? 'Uploading...' : 'Choose Screenshot'}
                  </label>
                </div>
              ) : (
                <div>
                  <img src={screenshotUrl} alt="Payment screenshot" style={{ height: '80px', borderRadius: '10px', margin: '0 auto 12px', display: 'block' }} />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button onClick={submitRequest} className="btn-primary" disabled={loading}>
                      {loading ? <Loader2 className="animate-spin" size={16} /> : `Submit Rs ${selectedPlan.price} Payment`}
                    </button>
                    <button onClick={() => setScreenshotUrl('')} className="btn-ghost">
                      Replace Screenshot
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
