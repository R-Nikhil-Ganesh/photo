import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import * as faceapi from 'face-api.js';
import { Camera, Image as ImageIcon, Loader2, Search } from 'lucide-react';
import PhotoResults from './PhotoResults';

const API_BASE_URL = 'http://localhost:8000';

export default function FindMeCapture({ accessLink }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [matchedUrls, setMatchedUrls] = useState(null);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        // Models must be placed in public/models/
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error("Model loading error: ", err);
        setError("Failed to load face recognition models. (Did you copy them to /public/models?)");
      }
    };
    loadModels();
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setError(null);
      setMatchedUrls(null); // Reset previous search
    }
  };

  const extractFaceVector = async () => {
    if (!imageRef.current) return null;

    // Extract face descriptor using client-side WebGL
    const detection = await faceapi.detectSingleFace(imageRef.current)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      throw new Error("No face detected in the image. Please try another selfie.");
    }

    // Convert Float32Array to standard JS Array
    return Array.from(detection.descriptor);
  };

  const handleSearch = async () => {
    if (!file || !modelsLoaded) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Run local ML to extract the 128 numbers
      const vector = await extractFaceVector();

      // 2. Send only the numbers to the backend! No images uploaded.
      const response = await axios.post(`${API_BASE_URL}/search/${accessLink}`, {
        encoding: vector
      });

      setMatchedUrls(response.data.matched_public_ids);
    } catch (err) {
      console.error(err);
      setError(err.message || err.response?.data?.detail || "An error occurred finding your photos.");
    } finally {
      setLoading(false);
    }
  };

  if (matchedUrls !== null) {
    return <PhotoResults matchedUrls={matchedUrls} onBack={() => setMatchedUrls(null)} />;
  }

  return (
    <div className="container animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div className="glass-panel" style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>

        <h2 className="text-gradient mb-md">Find Your Photos</h2>

        {!modelsLoaded && !error ? (
          <div style={{ padding: 'var(--spacing-xl)', color: 'var(--text-muted)' }}>
            <Loader2 className="animate-spin" style={{ margin: '0 auto var(--spacing-sm)' }} size={32} />
            <p>Loading AI Models in your browser...</p>
          </div>
        ) : (
          <>
            <p>Your browser's AI will scan your face <strong>locally</strong> to find matching photos securely.</p>

            <div style={{ margin: 'var(--spacing-xl) 0' }}>
              {preview ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img
                    ref={imageRef}
                    src={preview}
                    alt="Selfie preview"
                    crossOrigin="anonymous"
                    style={{
                      width: '200px',
                      height: '200px',
                      objectFit: 'cover',
                      borderRadius: 'var(--radius-full)',
                      border: '4px solid var(--primary)',
                      boxShadow: 'var(--shadow-glow)'
                    }}
                  />
                  <button
                    onClick={() => { setFile(null); setPreview(null); }}
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      background: 'var(--bg-dark)',
                      border: 'var(--glass-border)',
                      color: 'white',
                      borderRadius: 'var(--radius-full)',
                      padding: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    border: '2px dashed var(--primary)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--spacing-2xl)',
                    background: 'rgba(59, 130, 246, 0.05)',
                    cursor: 'pointer',
                    transition: 'var(--transition-fast)'
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                    <Camera size={32} color="var(--primary)" />
                    <ImageIcon size={32} color="var(--accent)" />
                  </div>
                  <h4 style={{ color: 'var(--text-main)' }}>Click to Upload Selfie</h4>
                  <p className="mb-0" style={{ fontSize: '0.875rem' }}>No images are saved to our servers.</p>
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: 'none' }}
              />
            </div>

            {error && <p style={{ color: '#ef4444', marginBottom: 'var(--spacing-md)' }}>{error}</p>}

            {file && (
              <button className="btn-primary flex items-center justify-center animate-fade-in" style={{ width: '100%', padding: '1rem' }} onClick={handleSearch} disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-md"><Loader2 className="animate-spin" /> Computing Face Vector...</span>
                ) : (
                  <span className="flex items-center gap-md"><Search size={20} /> Find My Photos</span>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
