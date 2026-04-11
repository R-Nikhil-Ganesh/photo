import React, { useState, useRef, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import * as faceapi from 'face-api.js';
import axios from 'axios';
import { Camera, RefreshCw, Check, Loader2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function SignupFlow() {
  const [googleToken, setGoogleToken] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const navigate = useNavigate();
  const { login } = useAuth();

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
        setError("AI models could not be initialized.");
      }
    };
    loadModels();
  }, []);

  const startCamera = async () => {
    setIsCameraActive(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 480 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error(err);
      setError("Please allow camera access to take a selfie.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  const handleGoogleSuccess = (credentialResponse) => {
    setGoogleToken(credentialResponse.credential);
  };

  const completeSignup = async () => {
    if (!imageRef.current || !googleToken) return;
    setLoading(true);
    setError(null);
    
    try {
      const detection = await faceapi.detectSingleFace(imageRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor();
        
      if (!detection) {
        throw new Error("No face detected! Please ensure your face is clear and visible.");
      }
      
      const faceVector = Array.from(detection.descriptor);

      const response = await axios.post(`${API_BASE_URL}/auth/google`, {
        token: googleToken,
        face_encoding: faceVector
      });

      // Use AuthContext to update UI state
      login(response.data.user, response.data.access_token);
      
      const searchParams = new URLSearchParams(window.location.search);
      const returnTo = searchParams.get('returnTo');
      navigate(returnTo || '/');
    } catch (err) {
      setError(err.message || err.response?.data?.detail || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container animate-fade-in flex flex-col items-center justify-center" style={{ minHeight: '80vh' }}>
      <div className="glass-panel" style={{ maxWidth: '500px', width: '100%', textAlign: 'center' }}>
        <h2 className="text-gradient">AI Account Setup</h2>
        <p className="mb-xl">One-time face mapping to never worry about finding photos again.</p>

        {!googleToken ? (
          <div className="flex justify-center mb-xl">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google Authentication Failed')}
              useOneTap
            />
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="flex items-center justify-center gap-sm mb-lg" style={{ color: '#10b981' }}>
              <Check size={20} />
              <span>Identity Verified</span>
            </div>

            <div style={{ position: 'relative', margin: 'var(--spacing-xl) 0', minHeight: '300px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
              
              {/* Live Camera Stream */}
              {isCameraActive && (
                <div style={{ width: '100%', height: '100%' }}>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
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

              {/* Captured Image Preview */}
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

              {/* Initial State / Start Button */}
              {!isCameraActive && !capturedImage && (
                <div className="flex flex-col items-center gap-md">
                   <div 
                    onClick={startCamera}
                    style={{ cursor: 'pointer', textAlign: 'center' }}
                  >
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--spacing-sm)' }}>
                      <Camera size={32} color="var(--primary)" />
                    </div>
                    <h4>Enable Camera</h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Take a clear front-facing selfie</p>
                  </div>
                </div>
              )}

              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            {error && <p className="mb-md" style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</p>}

            {capturedImage && modelsLoaded && (
              <button 
                className="btn-primary flex items-center justify-center" 
                style={{ width: '100%', padding: '1rem' }} 
                onClick={completeSignup} 
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin" /> : "Save Profile & Start Matching"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
