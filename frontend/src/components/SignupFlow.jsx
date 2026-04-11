import React, { useState, useRef, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import * as faceapi from 'face-api.js';
import axios from 'axios';
import { Camera, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function SignupFlow() {
  const [googleToken, setGoogleToken] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
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
        setError("Failed to load AI face mapping models.");
      }
    };
    loadModels();
  }, []);

  const handleGoogleSuccess = (credentialResponse) => {
    setGoogleToken(credentialResponse.credential);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const completeSignup = async () => {
    if (!imageRef.current || !googleToken) return;
    setLoading(true);
    
    try {
      const detection = await faceapi.detectSingleFace(imageRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor();
        
      if (!detection) {
        throw new Error("No face detected! Please use a clear selfie.");
      }
      
      const faceVector = Array.from(detection.descriptor);

      const response = await axios.post(`${API_BASE_URL}/auth/google`, {
        token: googleToken,
        face_encoding: faceVector
      });

      // Save token (in a real app, use Context/State manager)
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      navigate('/');
    } catch (err) {
      setError(err.message || err.response?.data?.detail || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container animate-fade-in flex flex-col items-center justify-center" style={{ minHeight: '80vh' }}>
      <div className="glass-panel" style={{ maxWidth: '500px', width: '100%', textAlign: 'center' }}>
        <h2 className="text-gradient">Create Account</h2>
        <p className="mb-xl">Connect your Google account and set up your permanent AI Face Profile.</p>

        {!googleToken ? (
          <div className="flex justify-center mb-xl">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google Sign In Failed')}
              useOneTap
            />
          </div>
        ) : (
          <div className="animate-fade-in">
            <h4 style={{ color: 'var(--primary)' }} className="mb-md">✓ Google Connected</h4>
            <p>Now, let's map your face securely in your browser so you never have to scan it again.</p>

            <div style={{ margin: 'var(--spacing-xl) 0' }}>
              {preview ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img 
                    ref={imageRef}
                    src={preview} 
                    alt="Selfie preview" 
                    crossOrigin="anonymous"
                    style={{ width: '200px', height: '200px', objectFit: 'cover', borderRadius: 'var(--radius-full)', border: '4px solid var(--primary)' }} 
                  />
                  <button 
                    onClick={() => { setFile(null); setPreview(null); }}
                    style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--bg-dark)', border: 'var(--glass-border)', color: 'white', borderRadius: 'var(--radius-full)', padding: '8px', cursor: 'pointer' }}
                  >✕</button>
                </div>
              ) : (
                <div 
                  style={{ border: '2px dashed var(--primary)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-2xl)', background: 'rgba(59, 130, 246, 0.05)', cursor: 'pointer' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera size={32} color="var(--primary)" style={{ margin: '0 auto var(--spacing-sm)' }} />
                  <h4 style={{ color: 'var(--text-main)' }}>Take AI Setup Selfie</h4>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" capture="user" style={{ display: 'none' }} />
            </div>

            {error && <p style={{ color: '#ef4444' }}>{error}</p>}

            {file && modelsLoaded && (
              <button className="btn-primary flex items-center justify-center validate-btn" style={{ width: '100%', padding: '1rem' }} onClick={completeSignup} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : "Save Profile & Enter"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
