import React, { useState, useRef, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import * as faceapi from 'face-api.js';
import axios from 'axios';
import { Camera, RefreshCw, Check, Loader2, X, Upload, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function SignupFlow() {
  const { login } = useAuth();
  const [googleToken, setGoogleToken] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);
  const imageRef = useRef(null);
  const navigate = useNavigate();

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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCapturedImage(URL.createObjectURL(file));
      setError(null);
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
        throw new Error("No face detected! Please ensure the photo clear and visible.");
      }
      
      const faceVector = Array.from(detection.descriptor);

      const response = await axios.post(`${API_BASE_URL}/auth/google`, {
        token: googleToken,
        face_encoding: faceVector
      });

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
        <p className="mb-xl">Upload a clear photo of your face to enable AI automatic matching.</p>

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

            <div style={{ position: 'relative', margin: 'var(--spacing-xl) 0', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)', padding: 'var(--spacing-xl)' }}>
              
              {capturedImage ? (
                <div style={{ position: 'relative' }}>
                  <img 
                    ref={imageRef}
                    src={capturedImage} 
                    alt="Selfie preview" 
                    crossOrigin="anonymous"
                    style={{ width: '250px', height: '250px', objectFit: 'cover', borderRadius: 'var(--radius-full)', border: '4px solid var(--primary)' }} 
                  />
                  <button 
                    onClick={() => setCapturedImage(null)}
                    style={{ position: 'absolute', top: '0', right: '0', background: 'var(--bg-dark)', color: 'white', borderRadius: '50%', padding: '8px', border: 'none', cursor: 'pointer' }}
                  >
                    <X size={20} />
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  style={{ cursor: 'pointer', textAlign: 'center' }}
                >
                  <Upload size={48} color="var(--primary)" style={{ margin: '0 auto var(--spacing-sm)' }} />
                  <h4>Select Profile Photo</h4>
                  <p className="text-muted" style={{ fontSize: '0.875rem' }}>Upload a photo with your face clear</p>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                  />
                </div>
              )}
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
