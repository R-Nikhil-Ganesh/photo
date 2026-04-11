import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Camera, RefreshCw, Upload, Check, Loader2, X, Trash2 } from 'lucide-react';
import * as faceapi from 'face-api.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function LiveBooth({ gallery, onComplete }) {
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
      setError("Camera access denied.");
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
    if (!videoRef.current || !canvasRef.current) return;
    setLoading(true);
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
      const image = await faceapi.bufferToImage(blob);
      const detections = await faceapi.detectAllFaces(image).withFaceLandmarks().withFaceDescriptors();

      if (detections.length === 0) {
        throw new Error("No faces detected in this shot! Try again.");
      }

      // 1. Prepare Cloudinary Upload
      const formData = new FormData();
      formData.append('file', blob);
      formData.append('upload_preset', 'ml_default'); // Default or your preset
      formData.append('cloud_name', import.meta.env.VITE_CLOUDINARY_CLOUD_NAME);

      const cloudinaryRes = await axios.post(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
        formData
      );

      // 2. Format face vectors for our backend
      const faces = detections.map(det => ({
        encoding: Array.from(det.descriptor),
        box: {
          top: det.detection.box.top,
          right: det.detection.box.right,
          bottom: det.detection.box.bottom,
          left: det.detection.box.left
        }
      }));

      // 3. Send to our Webhook
      await axios.post(`${API_BASE_URL}/webhook/cloudinary/${gallery.id}`, {
        public_id: cloudinaryRes.data.public_id,
        secure_url: cloudinaryRes.data.secure_url,
        width: cloudinaryRes.data.width,
        height: cloudinaryRes.data.height,
        faces: faces
      });

      setCapturedImage(cloudinaryRes.data.secure_url);
      stopCamera();
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel mt-lg animate-fade-in" style={{ textAlign: 'center' }}>
      <h3 className="mb-md">Live Booth for {gallery.name}</h3>
      
      <div style={{ position: 'relative', background: '#000', borderRadius: 'var(--radius-md)', aspectRatio: '16/9', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isCameraActive ? (
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : capturedImage ? (
          <img src={capturedImage} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Last shot" />
        ) : (
          <div className="flex flex-col items-center">
            <Camera size={48} color="var(--primary)" className="mb-sm" />
            <p>Ready to capture moments?</p>
          </div>
        )}
      </div>

      {error && <p style={{ color: '#ef4444', marginTop: '10px' }}>{error}</p>}

      <div className="flex justify-center gap-md mt-lg">
        {!isCameraActive ? (
          <button onClick={startCamera} className="btn-primary">
            {capturedImage ? "Take Another" : "Start Live Booth"}
          </button>
        ) : (
          <div className="flex gap-sm">
            <button onClick={captureAndUpload} className="btn-primary" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <Camera />} Capture & Upload
            </button>
            <button onClick={stopCamera} className="btn-secondary">Cancel</button>
          </div>
        )}
      </div>
      
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
