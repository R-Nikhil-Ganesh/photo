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
    const detection = await faceapi
      .detectSingleFace(imageRef.current)
      .withFaceLandmarks()
      .withFaceDescriptor();

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
      <div style={{ marginBottom: 'var(--spacing-lg)', textAlign: 'center' }}>
        {token && !googleToken ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#f59e0b', marginBottom: '8px' }}>
              <UserCircle2 size={20} />
              <span style={{ fontWeight: 600 }}>No Face Profile Found</span>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
              Take a quick selfie so the AI can recognise you across event galleries.
            </p>
          </>
        ) : (
          <div className="flex items-center justify-center gap-sm mb-sm" style={{ color: '#10b981' }}>
            <Check size={20} />
            <span>Identity Verified — now take a selfie</span>
          </div>
        )}
      </div>

      {/* Camera box */}
      <div style={{
        position: 'relative',
        margin: 'var(--spacing-xl) 0',
        minHeight: '300px',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        border: '1px solid var(--glass-border)'
      }}>
        {/* Live camera feed */}
        {isCameraActive && (
          <div style={{ width: '100%', height: '100%' }}>
            <video ref={videoRef} autoPlay playsInline muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '10px' }}>
              <button onClick={capturePhoto} className="btn-primary" style={{ borderRadius: '50px' }}>
                <Camera size={20} /> Capture Selfie
              </button>
              <button onClick={stopCamera} className="btn-secondary" style={{ borderRadius: '50px' }}>
                <X size={20} />
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
              style={{ width: '250px', height: '250px', objectFit: 'cover', borderRadius: 'var(--radius-full)', border: '4px solid var(--primary)', margin: '0 auto' }}
            />
            <button
              onClick={() => { setCapturedImage(null); startCamera(); }}
              style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--bg-dark)', color: 'white', borderRadius: '50%', padding: '8px', cursor: 'pointer', border: 'none' }}
            >
              <RefreshCw size={20} />
            </button>
          </div>
        )}

        {/* Idle — no camera, no image yet */}
        {!isCameraActive && !capturedImage && (
          <div className="flex flex-col items-center gap-md" style={{ cursor: 'pointer' }} onClick={startCamera}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--spacing-sm)' }}>
              <Camera size={32} color="var(--primary)" />
            </div>
            <h4>Enable Camera</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Take a clear front-facing selfie</p>
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      {error && <p style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: 'var(--spacing-md)' }}>{error}</p>}

      {success && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#10b981', marginBottom: 'var(--spacing-md)', fontWeight: 600 }}>
          <Check size={20} /> Face profile saved! Redirecting…
        </div>
      )}

      {capturedImage && modelsLoaded && !success && (
        <button
          className="btn-primary flex items-center justify-center"
          style={{ width: '100%', padding: '1rem' }}
          onClick={saveFaceProfile}
          disabled={loading}
        >
          {loading
            ? <><Loader2 className="animate-spin" size={20} style={{ marginRight: '8px' }} /> Computing…</>
            : token && !googleToken
              ? '💾  Save Face Profile'
              : 'Save Profile & Start Matching'
          }
        </button>
      )}

      {/* Skip Button */}
      {!success && (
        <button
          className="btn-secondary"
          style={{ width: '100%', padding: '0.8rem', marginTop: 'var(--spacing-sm)' }}
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
      <div className="glass-panel" style={{ maxWidth: '500px', width: '100%', textAlign: 'center' }}>
        <h2 className="text-gradient">
          {stage === 'face-capture' && token && !googleToken ? 'Add Your Face Photo' : 'AI Account Setup'}
        </h2>
        <p className="mb-xl">
          {stage === 'face-capture' && token && !googleToken
            ? 'Your account is missing a face profile. Add one to unlock AI photo sorting.'
            : 'Take a quick selfie to enable automatic AI matching across all event galleries.'}
        </p>

        {loading && stage === 'idle' ? (
          <div style={{ padding: 'var(--spacing-xl)', color: 'var(--text-muted)' }}>
            <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto var(--spacing-sm)' }} />
          </div>
        ) : stage === 'face-capture' ? (
          renderFaceCapture()
        ) : (
          <>
            <div className="flex justify-center mb-xl">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google Authentication Failed')}
                useOneTap
              />
            </div>
            {error && <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
