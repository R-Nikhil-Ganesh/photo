import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Camera, RefreshCw, Upload, Check, Loader2, X } from 'lucide-react';
import * as faceapi from 'face-api.js';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function LiveBooth({ gallery }) {
  const { token } = useAuth();
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const startCamera = async () => {
    setIsCameraActive(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: 1280, height: 720 } 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setError("Camera access denied. Please check site permissions.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  const captureAndUpload = async () => {
    if (!videoRef.current || !canvasRef.current || !token) {
        if (!token) setError("You must be logged in to upload.");
        return;
    }
    setLoading(true);
    setError(null);
    
    try {
      // 1. Capture from Canvas
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
      const image = await faceapi.bufferToImage(blob);
      
      // 2. Perform Face Detection Locally
      const detections = await faceapi.detectAllFaces(image).withFaceLandmarks().withFaceDescriptors();

      if (detections.length === 0) {
        throw new Error("No faces detected! Please ensure you are visible in the frame.");
      }

      // 3. Upload to Cloudinary (Unsigned Preset)
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const formData = new FormData();
      formData.append('file', blob);
      formData.append('upload_preset', 'ml_default'); 

      const cloudinaryRes = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        formData
      );

      // 4. Send Results to Backend Webhook (Now authenticated)
      const faces = detections.map(det => ({
        encoding: Array.from(det.descriptor),
        box: {
          top: det.detection.box.top,
          right: det.detection.box.right,
          bottom: det.detection.box.bottom,
          left: det.detection.box.left
        }
      }));

      await axios.post(`${API_BASE_URL}/webhook/cloudinary/${gallery.id}`, {
        public_id: cloudinaryRes.data.public_id,
        secure_url: cloudinaryRes.data.secure_url,
        width: cloudinaryRes.data.width,
        height: cloudinaryRes.data.height,
        faces: faces
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setCapturedImage(cloudinaryRes.data.secure_url);
      stopCamera();
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        setError("Session expired. Please log out and log back in.");
      } else if (err.response?.data?.error?.message) {
        setError(`Cloudinary Error: ${err.response.data.error.message}`);
      } else {
        setError(err.message || "Upload failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel mt-lg animate-fade-in" style={{ textAlign: 'center', maxWidth: '800px', margin: '20px auto' }}>
      <h3 className="mb-md">Live Booth: {gallery.name}</h3>
      
      <div style={{ position: 'relative', background: '#000', borderRadius: 'var(--radius-md)', aspectRatio: '16/9', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--glass-border)' }}>
        {isCameraActive ? (
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : capturedImage ? (
          <img src={capturedImage} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Last shot" />
        ) : (
          <div className="flex flex-col items-center">
            <Camera size={48} color="var(--primary)" className="mb-sm" />
            <p className="text-muted">Camera ready for live capture</p>
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '10px', borderRadius: 'var(--radius-md)', marginTop: '15px', fontSize: '0.875rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          ⚠️ {error}
        </div>
      )}

      <div className="flex justify-center gap-md mt-lg">
        {!isCameraActive ? (
          <button onClick={startCamera} className="btn-primary">
            {capturedImage ? <RefreshCw size={18} /> : null} {capturedImage ? "Take Another" : "Start Live Booth"}
          </button>
        ) : (
          <div className="flex gap-sm">
            <button onClick={captureAndUpload} className="btn-primary" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Camera size={18} />} 
              {loading ? " Uploading..." : " Capture & Cloud Upload"}
            </button>
            <button onClick={stopCamera} className="btn-secondary">
               Cancel
            </button>
          </div>
        )}
      </div>
      
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
