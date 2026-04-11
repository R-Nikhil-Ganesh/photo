import React from 'react';
import { ArrowLeft, Download } from 'lucide-react';

// You will need to setup the Cloudinary Advanced Image components in a real app,
// or just construct the URL manually if you know the cloud name.
// Assuming your cloud name setup for this demo:
const CLOUD_NAME = 'your_cloud_name'; 

export default function PhotoResults({ matchedIds, onBack }) {
  
  const generateCloudinaryUrl = (publicId) => {
    // Basic Cloudinary URL construction. 
    // Best practice is to use '@cloudinary/url-gen' library.
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/q_auto,f_auto,w_800/${publicId}`;
  };

  return (
    <div className="container animate-fade-in" style={{ paddingTop: 'var(--spacing-xl)' }}>
      
      <div className="flex items-center gap-md mb-xl">
        <button onClick={onBack} className="btn-secondary" style={{ padding: '8px' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="mb-0">Found <span className="text-gradient">{matchedIds.length}</span> Photos</h2>
      </div>

      {matchedIds.length === 0 ? (
        <div className="glass-panel text-center" style={{ marginTop: 'var(--spacing-2xl)' }}>
          <p style={{ fontSize: '1.2rem' }}>We couldn't find you in this gallery.</p>
          <p>Try capturing your selfie again with better lighting.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 'var(--spacing-lg)'
        }}>
          {matchedIds.map((id) => (
            <div key={id} style={{
              position: 'relative',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
              aspectRatio: '3/4', // Typical portrait photo ratio, adjust based on your needs
              background: 'var(--bg-card)'
            }}>
              <img 
                src={generateCloudinaryUrl(id)} 
                alt="Matched photo" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
              <div style={{
                position: 'absolute',
                bottom: 0, left: 0, right: 0,
                padding: 'var(--spacing-md)',
                background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                display: 'flex',
                justifyContent: 'flex-end'
              }}>
                <a 
                  href={generateCloudinaryUrl(id)} 
                  download 
                  target="_blank" 
                  rel="noreferrer"
                  className="btn-primary" 
                  style={{ padding: '8px', borderRadius: 'var(--radius-full)' }}
                  title="Download"
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
