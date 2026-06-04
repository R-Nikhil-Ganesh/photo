import React, { useState, useRef, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import * as faceapi from 'face-api.js';
import axios from 'axios';
import { Camera, RefreshCw, Check, Loader2, X, UserCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function SignupFlow() {
  const { login, token, user, updateUser } = useAuth();
  const navigate = useNavigate();

  // "google-pending"  → Google verified, need face
  // "update-profile"  → Already logged in (has token) but no face encoding
  const [stage, setStage] = useState('idle'); // idle | google-pending | face-capture | done
  const [googleToken, setGoogleToken] = useState(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  // If the user is already logged in AND they land on /signup, it means they need
  // to add their face photo (they came from the "Complete Profile" banner).
  useEffect(() => {
    if (token) {
      if (user?.has_face_encoding) {
        // User already has a face profile. They should not be here unless they came specifically for an update.
        // If they just hit the /signup path generally, let's get them back to their dashboard.
        const params = new URLSearchParams(window.location.search);
        const returnTo = params.get('returnTo');
        const mode = params.get('mode');

        if (!returnTo && mode !== 'update') {
           navigate('/');
           return;
        }
      }
      setStage('face-capture');
    }
  }, [token, user, navigate]);

  // Load face-api.js models once on mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error(err);
        setError('AI models could not be initialized.');
      }
    };
    loadModels();
  }, []);

  // ── Camera helpers ────────────────────────────────────────────────────────
  const startCamera = async () => {
    setIsCameraActive(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error(err);
      setError('Please allow camera access to take a selfie.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      setCapturedImage(canvas.toDataURL('image/jpeg'));
      stopCamera();
    }
  };

  // ── Google OAuth callback ─────────────────────────────────────────────────
  const handleGoogleSuccess = async (credentialResponse) => {
    const gToken = credentialResponse.credential;
    setGoogleToken(gToken);
    setError(null);
    setLoading(true);

    try {
      // 1. Authenticate with backend (this creates the user if they don't exist)
      const response = await axios.post(`${API_BASE_URL}/auth/google`, { token: gToken });
      
      const { user: userData, access_token, has_face_encoding } = response.data;
      
      // 2. Persist the session immediately
      login(userData, access_token, has_face_encoding);

      // 3. Decide where to go
      if (has_face_encoding) {
        // User already has a face profile — let's get them to their photos!
        const returnTo = new URLSearchParams(window.location.search).get('returnTo');
        navigate(returnTo || '/');
      } else {
        // New user or missing face — switch to the capture stage
        setStage('face-capture');
      }
    } catch (err) {
      console.error(err);
      setError('Login unsuccessful. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Extract face vector from the captured image ───────────────────────────
  const extractFaceVector = async () => {
    // Try progressively lower confidence to handle varied lighting/angles
    const confidenceLevels = [0.7, 0.5, 0.3];
    let detection = null;

    for (const conf of confidenceLevels) {
      const opts = new faceapi.SsdMobilenetv1Options({ minConfidence: conf });
      detection = await faceapi
        .detectSingleFace(imageRef.current, opts)
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (detection) break;
    }

    if (!detection) throw new Error('No face detected. Make sure your face is clear and well-lit.');
    return Array.from(detection.descriptor);
  };

  // ── Save face profile ─────────────────────────────────────────────────────
  const saveFaceProfile = async () => {
    if (!imageRef.current) return;
    setLoading(true);
    setError(null);

    try {
      const faceVector = await extractFaceVector();

      if (token) {
        // Already logged in — just update the encoding via the dedicated endpoint
        await axios.put(
          `${API_BASE_URL}/auth/face-encoding`,
          { face_encoding: faceVector },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        updateUser({ has_face_encoding: true });
        setSuccess(true);
        setTimeout(() => {
          const returnTo = new URLSearchParams(window.location.search).get('returnTo');
          navigate(returnTo || '/');
        }, 1500);
      } else if (googleToken) {
        // New user — create account with encoding via Google auth endpoint
        const response = await axios.post(`${API_BASE_URL}/auth/google`, {
          token: googleToken,
          face_encoding: faceVector
        });
        login(response.data.user, response.data.access_token, true);
        const returnTo = new URLSearchParams(window.location.search).get('returnTo');
        navigate(returnTo || '/');
      }
    } catch (err) {
      setError(err.message || err.response?.data?.detail || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  // ── Shared selfie-capture UI ──────────────────────────────────────────────
  const renderFaceCapture = () => (
    <div className="animate-fade-in">
      {/* Header varies depending on whether it's new signup or profile update */}
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        {token && !googleToken ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--gold)', marginBottom: '8px' }}>
              <UserCircle2 size={18} />
              <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>No Face Profile Found</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, fontWeight: 300 }}>
              Take a quick selfie so the AI can recognise you across event galleries.
            </p>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#22c55e', fontSize: '0.85rem' }}>
            <Check size={18} />
            <span>Identity Verified — now take a selfie</span>
          </div>
        )}
      </div>

      {/* Camera box */}
      <div style={{
        position: 'relative',
        margin: '2rem 0',
        minHeight: '300px',
        background: 'rgba(255,255,255,0.02)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)'
      }}>
        {/* Live camera feed */}
        {isCameraActive && (
          <div style={{ width: '100%', height: '100%' }}>
            <video ref={videoRef} autoPlay playsInline muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '10px' }}>
              <button onClick={capturePhoto} className="btn-primary" style={{ padding: '0.6rem 1.6rem' }}>
                <Camera size={18} /> Capture
              </button>
              <button onClick={stopCamera} className="btn-secondary" style={{ padding: '0.6rem 0.8rem' }}>
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Captured preview */}
        {capturedImage && !isCameraActive && (
          <div style={{ position: 'relative', width: '100%', textAlign: 'center', padding: '20px' }}>
            <img
              ref={imageRef}
              src={capturedImage}
              alt="Selfie preview"
              crossOrigin="anonymous"
              style={{ width: '220px', height: '220px', objectFit: 'cover', borderRadius: '50%', border: '2px solid var(--gold)', margin: '0 auto' }}
            />
            <button
              onClick={() => { setCapturedImage(null); startCamera(); }}
              style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', borderRadius: '50%', padding: '8px', cursor: 'pointer', border: '1px solid var(--border-strong)' }}
            >
              <RefreshCw size={18} />
            </button>
          </div>
        )}

        {/* Idle — no camera, no image yet */}
        {!isCameraActive && !capturedImage && (
          <div className="flex flex-col items-center gap-md" style={{ cursor: 'pointer', padding: '2rem' }} onClick={startCamera}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" stroke="#c9a96e" strokeWidth="1"/>
              <path d="M24 32V20M18 26l6-6 6 6" stroke="#c9a96e" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text)' }}>Enable Camera</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 300 }}>Take a clear front-facing selfie</p>
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      {error && <p style={{ color: '#ef4444', fontSize: '0.82rem', marginBottom: '1rem' }}>{error}</p>}

      {success && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#22c55e', marginBottom: '1rem', fontWeight: 500, fontSize: '0.85rem' }}>
          <Check size={18} /> Face profile saved! Redirecting…
        </div>
      )}

      {capturedImage && modelsLoaded && !success && (
        <button
          className="btn-primary"
          style={{ width: '100%', padding: '0.85rem', justifyContent: 'center' }}
          onClick={saveFaceProfile}
          disabled={loading}
        >
          {loading
            ? <><Loader2 className="animate-spin" size={18} style={{ marginRight: '8px' }} /> Computing…</>
            : token && !googleToken
              ? 'Save Face Profile'
              : 'Save Profile & Start Matching'
          }
        </button>
      )}

      {/* Skip Button */}
      {!success && (
        <button
          className="btn-secondary"
          style={{ width: '100%', padding: '0.7rem', marginTop: '8px', justifyContent: 'center' }}
          onClick={() => {
             stopCamera();
             const returnTo = new URLSearchParams(window.location.search).get('returnTo');
             navigate(returnTo || '/');
          }}
        >
          Skip for now
        </button>
      )}
    </div>
  );

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="container animate-fade-in flex flex-col items-center justify-center" style={{ minHeight: '80vh' }}>
      <div className="glass-panel" style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
        <div className="auth-eyebrow">
          {stage === 'face-capture' && token && !googleToken ? 'Profile Update' : 'Account Setup'}
        </div>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.9rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.6rem', lineHeight: 1.2 }}>
          {stage === 'face-capture' && token && !googleToken ? <>Add Your<br/>Face Photo</> : <>Welcome to<br/>Framy</>}
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '2.5rem', fontWeight: 300 }}>
          {stage === 'face-capture' && token && !googleToken
            ? 'Your account is missing a face profile. Add one to unlock AI photo sorting.'
            : 'Sign in to enable AI face matching across all your event galleries. Your selfie is processed client-side — never stored on our servers.'}
        </p>

        {loading && stage === 'idle' ? (
          <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>
            <Loader2 className="animate-spin" size={28} style={{ margin: '0 auto 8px' }} />
          </div>
        ) : stage === 'face-capture' ? (
          renderFaceCapture()
        ) : (
          <>
            <div className="flex justify-center mb-lg">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google Authentication Failed')}
                useOneTap
              />
            </div>
            <div className="divider"><span>or</span></div>
            {error && <p style={{ color: '#ef4444', fontSize: '0.82rem', marginBottom: '1rem' }}>{error}</p>}
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textAlign: 'center', marginTop: '1rem', lineHeight: 1.6 }}>
              By continuing, you agree to Framy's Terms of Service and Privacy Policy. Face data is never transmitted to our servers.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
