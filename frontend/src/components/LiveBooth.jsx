import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import * as faceapi from 'face-api.js';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function GalleryUploader({ gallery, onUploadComplete }) {
  const { token } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        if (!faceapi.nets.ssdMobilenetv1.params) {
          await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
          ]);
        }
        setModelsLoaded(true);
      } catch (err) {
        console.error("AI model load failed", err);
        setError("Failed to initialize AI face scanner.");
      }
    };
    loadModels();
  }, []);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0 || !token) return;
    if (!modelsLoaded) {
      setError("AI models still loading. Please wait a moment.");
      return;
    }

    setUploading(true);
    setProgress({ current: 0, total: files.length });
    setResults([]);
    setError(null);

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress(prev => ({ ...prev, current: i + 1 }));

      try {
        // 1. Process image for face detection
        const image = await faceapi.bufferToImage(file);
        // Detect faces with a balanced confidence to filter out background objects while keeping real people
        const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.45, maxResults: 500 });
        const detections = await faceapi.detectAllFaces(image, options).withFaceLandmarks().withFaceDescriptors();

        if (detections.length === 0) {
          setResults(prev => [...prev, { name: file.name, status: 'warning', message: 'No faces found' }]);
          continue;
        }

        // 2. Upload to Cloudinary (Using FETCH to avoid axios header conflicts)
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
        
        if (!cloudName) {
            throw new Error("Cloudinary configuration (VITE_CLOUDINARY_CLOUD_NAME) is missing in environment!");
        }
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'ml_default'); 

        let cloudinaryRes;
        try {
            const cResponse = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                {
                    method: 'POST',
                    body: formData,
                }
            );
            
            const cData = await cResponse.json();
            
            if (!cResponse.ok) {
                console.error("CLOUDINARY RAW ERROR:", cData);
                throw new Error(cData.error?.message || "Cloudinary Upload Failed");
            }
            
            cloudinaryRes = { data: cData };
        } catch (cErr) {
            console.error("CLOUDINARY FETCH FAIL:", cErr);
            throw cErr;
        }

        // 3. Format face vectors for backend
        const faces = detections.map(det => ({
            encoding: Array.from(det.descriptor),
            box: [
                Math.round(det.detection.box.top),
                Math.round(det.detection.box.right),
                Math.round(det.detection.box.bottom),
                Math.round(det.detection.box.left)
            ]
        }));

        // 4. Send to Backend
        console.log("Sending to Backend Webhook with Token:", token?.substring(0, 10) + "...");
        
        try {
            await axios.post(`${API_BASE_URL}/webhook/cloudinary/${gallery.id}`, {
                public_id: cloudinaryRes.data.public_id,
                secure_url: cloudinaryRes.data.secure_url,
                width: cloudinaryRes.data.width,
                height: cloudinaryRes.data.height,
                faces: faces
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (bErr) {
            console.error("BACKEND 401/ERROR:", bErr.response?.data || bErr);
            throw bErr;
        }

        setResults(prev => [...prev, { name: file.name, status: 'success' }]);

      } catch (err) {
        console.error(err);
        setResults(prev => [...prev, { name: file.name, status: 'error', message: err.message }]);
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onUploadComplete) onUploadComplete();
  };

  return (
    <div className="fade">
      {!uploading && (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="upload-box"
        >
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ marginBottom: '1.5rem', opacity: 0.3 }}>
            <circle cx="24" cy="24" r="20" stroke="#c9a96e" strokeWidth="1"/>
            <path d="M24 32V20M18 26l6-6 6 6" stroke="#c9a96e" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text)', marginBottom: '0.5rem' }}>Select assets for {gallery.name}</h4>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 300 }}>
            AI processing begins after selection<br/>
            <span style={{ opacity: 0.5 }}>JPG, PNG, HEIC up to 50MB each</span>
          </p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            multiple 
            accept="image/*" 
            style={{ display: 'none' }} 
          />
        </div>
      )}

      {uploading && (
        <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <Loader2 className="animate-spin" size={28} style={{ color: 'var(--gold)', margin: '0 auto 16px' }} />
          <h4 style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text)', marginBottom: '12px' }}>Processing {progress.current} of {progress.total}</h4>
          <div style={{ width: '100%', background: 'rgba(255,255,255,0.05)', height: '2px', marginTop: '10px' }}>
            <div style={{ width: `${(progress.current / progress.total) * 100}%`, background: 'var(--gold)', height: '100%', transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div style={{ marginTop: '2rem', textAlign: 'left' }}>
          <div className="panel-label">Upload Results</div>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {results.map((res, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.02)',
                borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{res.name}</span>
                {res.status === 'success' ? (
                  <CheckCircle size={16} color="#22c55e" />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: res.status === 'error' ? '#ef4444' : '#f59e0b' }}>
                    <AlertCircle size={14} />
                    <span style={{ fontSize: '0.72rem' }}>{res.message}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button className="btn-secondary" style={{ marginTop: '1rem', fontSize: '0.75rem', padding: '0.4rem 1rem' }} onClick={() => setResults([])}>Clear List</button>
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.06)', color: '#ef4444', padding: '12px 16px', borderLeft: '2px solid #ef4444', marginTop: '1rem', fontSize: '0.82rem' }}>
          {error}
        </div>
      )}
    </div>
  );
}
