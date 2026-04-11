import React, { useState } from 'react';
import { Download, Loader2, Link as LinkIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function PhotoResults({ matchedUrls }) {
  const navigate = useNavigate();
  const [zipping, setZipping] = useState(false);

  const downloadAllAsZip = async () => {
    setZipping(true);
    try {
      const zip = new JSZip();
      
      // Fetch all images and add them to the zip
      const fetchPromises = matchedUrls.map(async (url, index) => {
        const response = await fetch(url);
        const blob = await response.blob();
        
        // Extract original extension or default to .jpg
        const match = url.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
        const ext = match ? match[1] : 'jpg';
        
        zip.file(`Photo_${index + 1}.${ext}`, blob);
      });

      await Promise.all(fetchPromises);
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'My_Event_Photos.zip');

    } catch (err) {
      console.error("Error creating Zip file:", err);
      alert("Failed to create ZIP package. You can still download individually.");
    } finally {
      setZipping(false);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ paddingTop: 'var(--spacing-xl)' }}>
      
      <div className="flex items-center justify-between mb-xl">
        <h2 className="mb-0">Found <span className="text-gradient">{matchedUrls.length}</span> Photos</h2>
        
        {matchedUrls.length > 0 && (
          <button onClick={downloadAllAsZip} className="btn-primary" disabled={zipping}>
            {zipping ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
            {zipping ? " Zipping files..." : " Download All (ZIP)"}
          </button>
        )}
      </div>

      {matchedUrls.length === 0 ? (
        <div className="glass-panel text-center" style={{ marginTop: 'var(--spacing-2xl)' }}>
          <p style={{ fontSize: '1.2rem' }}>We couldn't find you in this gallery.</p>
          <button onClick={() => navigate('/')} className="btn-secondary mt-md">Go Back</button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 'var(--spacing-lg)'
        }}>
          {matchedUrls.map((url, i) => (
            <div key={i} style={{
              position: 'relative',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
              aspectRatio: '3/4',
              background: 'var(--bg-card)'
            }}>
              <img 
                src={url} 
                alt="Matched photo" 
                crossOrigin="anonymous" /* Crucial for JSZip to read the canvas/blob */
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
              <div style={{
                position: 'absolute',
                bottom: 0, left: 0, right: 0,
                padding: 'var(--spacing-md)',
                background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <a 
                  href={url} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ color: 'white' }}
                >
                  <LinkIcon size={18} />
                </a>
                <a 
                  href={url} 
                  download 
                  target="_blank" 
                  rel="noreferrer"
                  className="btn-primary" 
                  style={{ padding: '8px', borderRadius: 'var(--radius-full)' }}
                >
                  <Download size={18} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
