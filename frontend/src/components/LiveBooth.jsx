import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { UploadCloud, CheckCircle, AlertCircle, Loader2, X, Image as ImageIcon } from 'lucide-react';
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
        const detections = await faceapi.detectAllFaces(image).withFaceLandmarks().withFaceDescriptors();

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
    <div className="glass-panel mt-lg animate-fade-in" style={{ textAlign: 'center', maxWidth: '800px', margin: '20px auto' }}>
      <h3 className="mb-md">Upload to Folder: {gallery.name}</h3>
      
      {!uploading && (
        <div 
          onClick={() => fileInputRef.current?.click()}
          style={{ 
            border: '2px dashed var(--glass-border)', 
            borderRadius: 'var(--radius-lg)', 
            padding: 'var(--spacing-2xl)', 
            background: 'rgba(59, 130, 246, 0.05)', 
            cursor: 'pointer',
            transition: 'all 0.2s ease' 
          }}
          onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
          onMouseOut={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
        >
          <UploadCloud size={48} color="var(--primary)" style={{ margin: '0 auto var(--spacing-sm)' }} />
          <h4>Drop photos or click to upload</h4>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>AI will scan each photo during upload.</p>
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
        <div className="py-xl">
          <Loader2 className="animate-spin mb-md" size={32} color="var(--primary)" style={{ margin: '0 auto' }} />
          <h4>Processing {progress.current} of {progress.total}</h4>
          <div style={{ width: '100%', background: 'var(--bg-input)', height: '6px', borderRadius: '3px', marginTop: '10px' }}>
            <div style={{ width: `${(progress.current / progress.total) * 100}%`, background: 'var(--primary)', height: '100%', borderRadius: '3px', transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div style={{ marginTop: 'var(--spacing-xl)', textAlign: 'left' }}>
          <h5 className="mb-md">Upload Results</h5>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {results.map((res, idx) => (
              <div key={idx} className="flex items-center justify-between mb-sm p-sm" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)' }}>
                <div className="flex items-center gap-sm">
                   <ImageIcon size={16} className="text-muted" />
                   <span style={{ fontSize: '0.875rem' }}>{res.name}</span>
                </div>
                {res.status === 'success' ? (
                  <CheckCircle size={18} color="#10b981" />
                ) : (
                  <div className="flex items-center gap-xs" style={{ color: res.status === 'error' ? '#ef4444' : '#f59e0b' }}>
                    <AlertCircle size={16} />
                    <span style={{ fontSize: '0.75rem' }}>{res.message}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button className="btn-secondary mt-md" onClick={() => setResults([])}>Clear List</button>
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '10px', borderRadius: 'var(--radius-md)', marginTop: '15px' }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
