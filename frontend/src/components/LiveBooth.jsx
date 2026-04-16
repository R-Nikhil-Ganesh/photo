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
        // 1. Resize large images before detection — improves speed and recall
        const image = await faceapi.bufferToImage(file);
        const canvas = document.createElement('canvas');
        const MAX_DIM = 1280;
        const scale = Math.min(1, MAX_DIM / Math.max(image.width, image.height));
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);

        // 2. Multi-pass detection: try progressively lower confidence to catch more faces
        let detections = [];
        const confidenceLevels = [0.5, 0.35, 0.2];
        for (const conf of confidenceLevels) {
          const opts = new faceapi.SsdMobilenetv1Options({ minConfidence: conf, maxResults: 500 });
          detections = await faceapi.detectAllFaces(canvas, opts).withFaceLandmarks().withFaceDescriptors();
          if (detections.length > 0) break;
        }

        // 3. Upload to Cloudinary regardless of face count — photos without faces still belong in the gallery
        if (!cloudName) {
          throw new Error("Cloudinary configuration (VITE_CLOUDINARY_CLOUD_NAME) is missing in environment!");
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'ml_default');

        const cResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          { method: 'POST', body: formData }
        );
        const cData = await cResponse.json();
        if (!cResponse.ok) throw new Error(cData.error?.message || "Cloudinary Upload Failed");

        // 4. Scale bounding boxes back to original image dimensions
        const scaleBack = 1 / scale;
        const faces = detections.map(det => ({
          encoding: Array.from(det.descriptor),
          box: [
            Math.round(det.detection.box.top * scaleBack),
            Math.round(det.detection.box.right * scaleBack),
            Math.round(det.detection.box.bottom * scaleBack),
            Math.round(det.detection.box.left * scaleBack),
          ]
        }));

        // 5. Send to backend
        await axios.post(`${API_BASE_URL}/webhook/cloudinary/${gallery.id}`, {
          public_id: cData.public_id,
          secure_url: cData.secure_url,
          width: cData.width,
          height: cData.height,
          faces,
        }, { headers: { Authorization: `Bearer ${token}` } });

        const faceNote = detections.length === 0 ? ' (no faces detected)' : ` · ${detections.length} face${detections.length > 1 ? 's' : ''}`;
        setResults(prev => [...prev, { name: file.name, status: detections.length === 0 ? 'warning' : 'success', message: detections.length === 0 ? 'Uploaded — no faces found' : undefined, faceNote }]);

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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#22c55e' }}>
                    <CheckCircle size={16} />
                    {res.faceNote && <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{res.faceNote}</span>}
                  </div>
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
