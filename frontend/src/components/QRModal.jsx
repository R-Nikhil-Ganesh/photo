import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download, Copy } from 'lucide-react';

export default function QRModal({ galleryName, accessLink, onClose }) {
  const qrRef = useRef(null);
  const galleryUrl = `${window.location.origin}/gallery/${accessLink}`;

  const downloadQR = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      canvas.width = 400;
      canvas.height = 400;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 400, 400);
      ctx.drawImage(img, 0, 0, 400, 400);
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      a.download = `${galleryName}-qr.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = url;
  };

  const copyLink = () => {
    navigator.clipboard.writeText(galleryUrl);
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
    >
      <div
        className="modal-card"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '380px', textAlign: 'center' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Event QR Code</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}>{galleryName}</div>
          </div>
          <button
            onClick={onClose}
            className="icon-button"
            aria-label="Close QR code dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* QR Code */}
        <div
          ref={qrRef}
          style={{
            background: '#ffffff', padding: '20px', borderRadius: '8px',
            display: 'inline-block', marginBottom: '1.5rem',
          }}
        >
          <QRCodeSVG
            value={galleryUrl}
            size={200}
            bgColor="#ffffff"
            fgColor="#0a0908"
            level="M"
          />
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Guests can scan this code to open the event gallery directly on their phones.
        </p>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={copyLink}
            className="btn-ghost"
            style={{ flex: 1, fontSize: '0.75rem', padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Copy size={14} /> Copy Link
          </button>
          <button
            onClick={downloadQR}
            className="btn-primary"
            style={{ flex: 1, fontSize: '0.75rem', padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Download size={14} /> Download QR
          </button>
        </div>
      </div>
    </div>
  );
}
