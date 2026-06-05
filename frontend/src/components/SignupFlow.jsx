import React, { useEffect, useRef, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import * as faceapi from 'face-api.js';
import axios from 'axios';
import { Camera, Check, Loader2, RefreshCw, UserCircle2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function SignupFlow() {
  const { login, token, user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [stage, setStage] = useState('idle');
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

  useEffect(() => {
    if (token) {
      if (user?.has_face_encoding) {
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

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error(err);
        setError('AI models could not be initialized.');
      }
    };
    loadModels();
  }, []);

  const startCamera = async () => {
    setIsCameraActive(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
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
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    setCapturedImage(canvas.toDataURL('image/jpeg'));
    stopCamera();
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    const nextGoogleToken = credentialResponse.credential;
    setGoogleToken(nextGoogleToken);
    setError(null);
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/google`, { token: nextGoogleToken });
      const { user: userData, access_token, has_face_encoding } = response.data;

      login(userData, access_token, has_face_encoding);

      if (has_face_encoding) {
        const returnTo = new URLSearchParams(window.location.search).get('returnTo');
        navigate(returnTo || '/');
      } else {
        setStage('face-capture');
      }
    } catch (err) {
      console.error(err);
      setError('Login unsuccessful. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const extractFaceVector = async () => {
    const confidenceLevels = [0.7, 0.5, 0.3];
    let detection = null;

    for (const confidence of confidenceLevels) {
      const options = new faceapi.SsdMobilenetv1Options({ minConfidence: confidence });
      detection = await faceapi
        .detectSingleFace(imageRef.current, options)
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (detection) break;
    }

    if (!detection) {
      throw new Error('No face detected. Make sure your face is clear and well lit.');
    }

    return Array.from(detection.descriptor);
  };

  const saveFaceProfile = async () => {
    if (!imageRef.current) return;
    setLoading(true);
    setError(null);

    try {
      const faceVector = await extractFaceVector();

      if (token) {
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
        const response = await axios.post(`${API_BASE_URL}/auth/google`, {
          token: googleToken,
          face_encoding: faceVector,
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

  const renderFaceCapture = () => (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        {token && !googleToken ? (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: 'var(--gold)',
                marginBottom: '8px',
              }}
            >
              <UserCircle2 size={18} />
              <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Face profile missing</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
              Take a clear selfie so the app can match you across event galleries.
            </p>
          </>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              color: '#22c55e',
              fontSize: '0.85rem',
            }}
          >
            <Check size={18} />
            <span>Identity verified. Next, add a selfie.</span>
          </div>
        )}
      </div>

      <div
        style={{
          position: 'relative',
          margin: '2rem 0',
          minHeight: '320px',
          background: 'rgba(255,255,255,0.02)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '18px',
        }}
      >
        {isCameraActive && (
          <div style={{ width: '100%', height: '100%' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '10px',
              }}
            >
              <button onClick={capturePhoto} className="btn-primary">
                <Camera size={18} /> Capture
              </button>
              <button onClick={stopCamera} className="btn-secondary" aria-label="Stop camera">
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {capturedImage && !isCameraActive && (
          <div style={{ position: 'relative', width: '100%', textAlign: 'center', padding: '20px' }}>
            <img
              ref={imageRef}
              src={capturedImage}
              alt="Selfie preview"
              crossOrigin="anonymous"
              style={{
                width: '220px',
                height: '220px',
                objectFit: 'cover',
                borderRadius: '50%',
                border: '2px solid var(--gold)',
                margin: '0 auto',
              }}
            />
            <button
              onClick={() => {
                setCapturedImage(null);
                startCamera();
              }}
              className="icon-button"
              style={{ position: 'absolute', top: '10px', right: '10px' }}
              aria-label="Retake selfie"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        )}

        {!isCameraActive && !capturedImage && (
          <button
            type="button"
            className="upload-box"
            onClick={startCamera}
            style={{ width: '100%', border: 'none', background: 'transparent' }}
          >
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" stroke="#c9a96e" strokeWidth="1" />
              <path d="M24 32V20M18 26l6-6 6 6" stroke="#c9a96e" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h4 style={{ fontSize: '0.94rem', fontWeight: 500, color: 'var(--text)' }}>Enable Camera</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              Use a front-facing selfie with even lighting.
            </p>
          </button>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      {error && <p style={{ color: '#ef4444', fontSize: '0.82rem', marginBottom: '1rem' }}>{error}</p>}

      {success && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: '#22c55e',
            marginBottom: '1rem',
            fontWeight: 500,
            fontSize: '0.85rem',
          }}
        >
          <Check size={18} /> Face profile saved. Redirecting...
        </div>
      )}

      {capturedImage && modelsLoaded && !success && (
        <button
          className="btn-primary"
          style={{ width: '100%' }}
          onClick={saveFaceProfile}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Processing Face Signature
            </>
          ) : token && !googleToken ? (
            'Save Face Profile'
          ) : (
            'Save Profile and Start Matching'
          )}
        </button>
      )}

      {!success && (
        <button
          className="btn-secondary"
          style={{ width: '100%', marginTop: '8px' }}
          onClick={() => {
            stopCamera();
            const returnTo = new URLSearchParams(window.location.search).get('returnTo');
            navigate(returnTo || '/');
          }}
        >
          Skip for Now
        </button>
      )}
    </div>
  );

  return (
    <div className="container animate-fade-in flex flex-col items-center justify-center" style={{ minHeight: '80vh' }}>
      <div className="glass-panel" style={{ maxWidth: '460px', width: '100%', textAlign: 'center' }}>
        <div className="auth-eyebrow">
          {stage === 'face-capture' && token && !googleToken ? 'Profile Update' : 'Account Setup'}
        </div>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.6rem', lineHeight: 1.1 }}>
          {stage === 'face-capture' && token && !googleToken ? (
            <>
              Add Your
              <br />
              Face Photo
            </>
          ) : (
            <>
              Welcome to
              <br />
              Framy
            </>
          )}
        </h2>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '2rem' }}>
          {stage === 'face-capture' && token && !googleToken
            ? 'Your account is missing a face profile. Add one to unlock AI photo sorting and faster guest search.'
            : 'Sign in to enable AI face matching across your event galleries. Your selfie image stays in the browser. Only the face signature used for matching is saved to your account.'}
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
                onError={() => setError('Google authentication failed.')}
                useOneTap
              />
            </div>
            <div className="divider"><span>or</span></div>
            {error && <p style={{ color: '#ef4444', fontSize: '0.82rem', marginBottom: '1rem' }}>{error}</p>}
            <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textAlign: 'center', marginTop: '1rem', lineHeight: 1.6 }}>
              By continuing, you agree to Framy&apos;s Terms of Service and Privacy Policy.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
