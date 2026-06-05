import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import {
  FolderOpen, QrCode, Trash2, Settings, User, LogOut,
  Plus, ArrowRight, X, Check, ChevronRight, Camera,
  Lock, Globe, Calendar, Zap, Image,
  Heart, Copy, UserCircle2, AlertCircle, ExternalLink,
  Share2, Sparkles, Shield, Bell, CreditCard, Key
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import GalleryUploader from './LiveBooth';
import QRModal from './QRModal';
import './Dashboard.css';
import ghostBg from '../assets/ghost_bg.jpg';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── New Collection Modal ─────────────────────────────────────────────────────
function NewCollectionModal({ onClose, onCreated }) {
  const { token } = useAuth();
  const [step, setStep] = useState(1);
  const [leaving, setLeaving] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    name: '',
    eventDate: '',
    isPublic: true,
    faceMatchEnabled: true,
    pinEnabled: false,
    pin: '',
  });

  const nameRef = useRef(null);
  useEffect(() => { nameRef.current?.focus(); }, []);

  const canProceed1 = form.name.trim().length >= 2;

  const goNext = () => {
    setLeaving(true);
    setTimeout(() => { setStep(s => s + 1); setLeaving(false); }, 220);
  };
  const goPrev = () => {
    setLeaving(true);
    setTimeout(() => { setStep(s => s - 1); setLeaving(false); }, 220);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      await axios.post(
        `${API_BASE_URL}/gallery/`,
        { name: form.name.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onCreated();
      onClose();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create collection');
    } finally {
      setCreating(false);
    }
  };

  const STEPS = ['Name & Date', 'Access', 'Confirm'];

  return (
    <div className="db-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="New Collection">
      <div className="db-modal" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="db-modal-header">
          <div className="db-modal-step-indicator">
            {STEPS.map((label, i) => {
              const n = i + 1;
              const done = step > n;
              const active = step === n;
              return (
                <React.Fragment key={n}>
                  <div className={`db-step-dot ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
                    {done ? <Check size={11} /> : n}
                  </div>
                  <div className={`db-step-label ${active ? 'active' : ''}`}>{label}</div>
                  {i < STEPS.length - 1 && (
                    <div className={`db-step-line ${step > n ? 'done' : ''}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <button className="db-modal-close" onClick={onClose} aria-label="Close">
            <X size={17} />
          </button>
        </div>

        {/* Modal Body */}
        <div className={`db-modal-body ${leaving ? 'db-slide-out' : 'db-slide-in'}`}>
          {/* Step 1 */}
          {step === 1 && (
            <div className="db-modal-step">
              <div className="db-modal-step-eyebrow">Step 1 of 3</div>
              <h2 className="db-modal-h2">Name your collection</h2>
              <p className="db-modal-desc">Give this event a name. Your guests will see this when they access the gallery.</p>
              <div className="db-form-group">
                <label className="db-label" htmlFor="modal-collection-name">Collection Name</label>
                <input
                  ref={nameRef}
                  id="modal-collection-name"
                  className="db-input"
                  placeholder="e.g. Sarah & James Wedding"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && canProceed1 && goNext()}
                  maxLength={80}
                />
                <span className="db-input-hint">{form.name.length}/80 characters</span>
              </div>
              <div className="db-form-group">
                <label className="db-label" htmlFor="modal-event-date">
                  <Calendar size={13} /> Event Date <span className="db-label-optional">(optional)</span>
                </label>
                <input
                  id="modal-event-date"
                  type="date"
                  className="db-input db-input-date"
                  value={form.eventDate}
                  onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="db-modal-step">
              <div className="db-modal-step-eyebrow">Step 2 of 3</div>
              <h2 className="db-modal-h2">Access settings</h2>
              <p className="db-modal-desc">Choose how guests will access and interact with your gallery.</p>

              <div className="db-toggle-row" onClick={() => setForm(f => ({ ...f, isPublic: !f.isPublic }))}>
                <div className="db-toggle-icon">
                  {form.isPublic ? <Globe size={18} /> : <Lock size={18} />}
                </div>
                <div className="db-toggle-copy">
                  <div className="db-toggle-title">{form.isPublic ? 'Public Gallery' : 'Private Gallery'}</div>
                  <div className="db-toggle-desc">{form.isPublic ? 'Anyone with the link can view photos' : 'Only invited guests can access'}</div>
                </div>
                <div className={`db-toggle-switch ${form.isPublic ? 'on' : ''}`}><div className="db-toggle-knob" /></div>
              </div>

              <div className="db-toggle-row" onClick={() => setForm(f => ({ ...f, faceMatchEnabled: !f.faceMatchEnabled }))}>
                <div className="db-toggle-icon"><Zap size={18} /></div>
                <div className="db-toggle-copy">
                  <div className="db-toggle-title">AI Face Matching</div>
                  <div className="db-toggle-desc">{form.faceMatchEnabled ? 'Guests find their photos with a selfie' : 'Guests browse the full gallery'}</div>
                </div>
                <div className={`db-toggle-switch ${form.faceMatchEnabled ? 'on' : ''}`}><div className="db-toggle-knob" /></div>
              </div>

              <div className="db-toggle-row" onClick={() => setForm(f => ({ ...f, pinEnabled: !f.pinEnabled }))}>
                <div className="db-toggle-icon"><Lock size={18} /></div>
                <div className="db-toggle-copy">
                  <div className="db-toggle-title">PIN Protection</div>
                  <div className="db-toggle-desc">{form.pinEnabled ? 'Guests must enter a PIN to access' : 'No PIN required'}</div>
                </div>
                <div className={`db-toggle-switch ${form.pinEnabled ? 'on' : ''}`}><div className="db-toggle-knob" /></div>
              </div>

              {form.pinEnabled && (
                <div className="db-form-group db-form-group-pin">
                  <label className="db-label" htmlFor="modal-pin">Gallery PIN</label>
                  <input
                    id="modal-pin"
                    className="db-input"
                    placeholder="4–8 characters"
                    value={form.pin}
                    onChange={e => setForm(f => ({ ...f, pin: e.target.value }))}
                    maxLength={8}
                  />
                </div>
              )}

              <div className="db-settings-note">
                <AlertCircle size={13} />
                Settings can be changed after creation from collection settings.
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="db-modal-step">
              <div className="db-modal-step-eyebrow">Step 3 of 3</div>
              <h2 className="db-modal-h2">Ready to create</h2>
              <p className="db-modal-desc">Review your collection before it goes live.</p>

              <div className="db-confirm-card">
                <div className="db-confirm-card-header">
                  <div className="db-confirm-icon"><FolderOpen size={20} /></div>
                  <div>
                    <div className="db-confirm-name">{form.name}</div>
                    {form.eventDate && (
                      <div className="db-confirm-date">
                        <Calendar size={12} />
                        {new Date(form.eventDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="db-confirm-attrs">
                  <div className="db-confirm-attr">
                    {form.isPublic ? <Globe size={13} /> : <Lock size={13} />}
                    <span>{form.isPublic ? 'Public access' : 'Private access'}</span>
                  </div>
                  <div className="db-confirm-attr">
                    <Zap size={13} />
                    <span>Face matching {form.faceMatchEnabled ? 'enabled' : 'disabled'}</span>
                  </div>
                  <div className="db-confirm-attr">
                    <Lock size={13} />
                    <span>PIN {form.pinEnabled ? 'required' : 'not required'}</span>
                  </div>
                </div>
              </div>
              <div className="db-confirm-note">
                After creation you'll be taken directly to your collection to start uploading photos.
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="db-modal-footer">
          {step > 1 && (
            <button className="db-btn-ghost" onClick={goPrev} disabled={creating}>Back</button>
          )}
          <div style={{ flex: 1 }} />
          {step < 3 ? (
            <button className="db-btn-primary" onClick={goNext} disabled={step === 1 && !canProceed1}>
              Continue <ArrowRight size={15} />
            </button>
          ) : (
            <button
              id="modal-create-collection"
              className="db-btn-primary db-btn-create"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? <span className="db-spinner" /> : <><FolderOpen size={15} /> Create Collection</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Ghost sample card (empty state preview) ──────────────────────────────────
function GhostCollectionCard() {
  return (
    <div className="db-ghost-card" aria-hidden="true">
      <div className="db-ghost-status">
        <span className="db-ghost-dot" /> Active
      </div>
      <div className="db-ghost-name">Summer Wedding 2025</div>
      <div className="db-ghost-event-date"><Calendar size={11} /> 14 June 2025</div>
      <div className="db-ghost-stats">
        <div className="db-ghost-stat"><Image size={12} /> 842 photos</div>
        <div className="db-ghost-stat"><Sparkles size={12} /> 156 matched</div>
      </div>
      <div className="db-ghost-divider" />
      <div className="db-ghost-footer">
        <div className="db-ghost-link">framy.app/gallery/sw-june-2025</div>
        <div className="db-ghost-actions">
          <div className="db-ghost-action-btn"><Share2 size={12} /> Share</div>
          <div className="db-ghost-action-btn"><QrCode size={12} /> QR</div>
        </div>
      </div>
      <div className="db-ghost-label">Sample collection</div>
    </div>
  );
}

// ─── Collection card — redesigned as a proper project card ────────────────────
function CollectionCard({ gallery, onOpen, onQR, onDelete }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/gallery/${gallery.access_link}`;

  const copyLink = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article
      className="db-collection-card"
      onClick={() => onOpen(gallery)}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen(gallery))}
      tabIndex={0}
      role="button"
      aria-label={`Open collection ${gallery.name}`}
    >
      {/* Status row */}
      <div className="db-card-status-row">
        <div className="db-card-status-pill">
          <span className="db-card-status-dot" />
          Active
        </div>
        <ChevronRight size={14} className="db-card-chevron" />
      </div>

      {/* Collection name */}
      <div className="db-card-name">{gallery.name}</div>

      {/* Event date placeholder */}
      <div className="db-card-date">
        <Calendar size={12} />
        <span>No date set</span>
      </div>

      {/* Stats strip */}
      <div className="db-card-stats">
        <div className="db-card-stat">
          <Image size={13} />
          <span>Upload photos to see count</span>
        </div>
        <div className="db-card-stat db-card-stat-muted">
          <Sparkles size={13} />
          <span>AI matching ready</span>
        </div>
      </div>

      {/* Divider */}
      <div className="db-card-divider" />

      {/* Footer: share link + actions */}
      <div className="db-card-footer">
        <div className="db-card-share-url" title={shareUrl}>
          <ExternalLink size={11} />
          <span className="db-card-url-text">{shareUrl.replace('http://', '').replace('https://', '')}</span>
        </div>
        <div className="db-card-actions">
          <button
            className="db-card-action-btn"
            onClick={copyLink}
            title="Copy share link"
            aria-label="Copy share link"
          >
            <Copy size={13} />
            <span>{copied ? 'Copied!' : 'Share'}</span>
          </button>
          <button
            className="db-card-action-btn"
            onClick={e => { e.stopPropagation(); onQR(gallery); }}
            title="Show QR code"
            aria-label="Show QR code"
          >
            <QrCode size={13} />
            <span>QR</span>
          </button>
          <button
            className="db-card-action-btn db-card-action-danger"
            onClick={e => { e.stopPropagation(); onDelete(gallery); }}
            title="Delete collection"
            aria-label="Delete collection"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── "New Collection" ghost card in the populated grid ────────────────────────
function AddCollectionCard({ onClick }) {
  return (
    <button className="db-add-card" onClick={onClick} aria-label="Create new collection">
      <div className="db-add-card-inner">
        <div className="db-add-card-icon"><Plus size={20} /></div>
        <div className="db-add-card-label">New Collection</div>
        <div className="db-add-card-sub">Start a new event gallery</div>
      </div>
    </button>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────
function DeleteModal({ gallery, onConfirm, onCancel }) {
  return (
    <div className="db-modal-backdrop" onClick={onCancel}>
      <div className="db-delete-modal" onClick={e => e.stopPropagation()}>
        <div className="db-delete-icon"><Trash2 size={20} /></div>
        <h3 className="db-delete-title">Delete "{gallery.name}"?</h3>
        <p className="db-delete-desc">
          This removes all photos and cannot be undone. Your guests will lose access immediately.
        </p>
        <div className="db-delete-actions">
          <button className="db-btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="db-btn-danger" onClick={() => onConfirm(gallery)}>Delete Permanently</button>
        </div>
      </div>
    </div>
  );
}

// ─── Settings panel ───────────────────────────────────────────────────────────
function SettingsPanel({ navigate }) {
  return (
    <div className="db-panel-root">
      <div className="db-canvas-eyebrow">Preferences</div>
      <h1 className="db-canvas-title">Settings</h1>
      <div className="db-settings-grid">
        <div className="db-settings-section">
          <div className="db-settings-section-label">Gallery Defaults</div>
          <div className="db-settings-row">
            <div className="db-settings-row-icon"><Globe size={16} /></div>
            <div className="db-settings-row-copy">
              <div className="db-settings-row-title">Default gallery visibility</div>
              <div className="db-settings-row-desc">New collections default to public access</div>
            </div>
            <div className="db-settings-row-value">Public</div>
          </div>
          <div className="db-settings-row">
            <div className="db-settings-row-icon"><Sparkles size={16} /></div>
            <div className="db-settings-row-copy">
              <div className="db-settings-row-title">AI face matching</div>
              <div className="db-settings-row-desc">Enable by default on new collections</div>
            </div>
            <div className="db-settings-row-value db-settings-enabled">Enabled</div>
          </div>
        </div>

        <div className="db-settings-section">
          <div className="db-settings-section-label">Notifications</div>
          <div className="db-settings-row">
            <div className="db-settings-row-icon"><Bell size={16} /></div>
            <div className="db-settings-row-copy">
              <div className="db-settings-row-title">Guest activity alerts</div>
              <div className="db-settings-row-desc">Notify when guests download photos</div>
            </div>
            <div className="db-settings-row-value">Off</div>
          </div>
        </div>

        <div className="db-settings-section">
          <div className="db-settings-section-label">Plan & Billing</div>
          <div className="db-settings-row">
            <div className="db-settings-row-icon"><CreditCard size={16} /></div>
            <div className="db-settings-row-copy">
              <div className="db-settings-row-title">Manage subscription</div>
              <div className="db-settings-row-desc">View plan limits and upgrade options</div>
            </div>
            <button className="db-settings-row-action" onClick={() => navigate('/subscribe')}>
              View Plans <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Account panel ────────────────────────────────────────────────────────────
function AccountPanel({ user, navigate, logout }) {
  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '??';

  return (
    <div className="db-panel-root">
      <div className="db-canvas-eyebrow">Your profile</div>
      <h1 className="db-canvas-title">Account</h1>

      <div className="db-account-profile-card">
        <div className="db-account-avatar">{initials}</div>
        <div className="db-account-info">
          <div className="db-account-name">{user?.name || 'Photographer'}</div>
          <div className="db-account-email">{user?.email || '—'}</div>
        </div>
      </div>

      <div className="db-settings-grid">
        <div className="db-settings-section">
          <div className="db-settings-section-label">Face Photo</div>
          <div className="db-settings-row">
            <div className="db-settings-row-icon"><UserCircle2 size={16} /></div>
            <div className="db-settings-row-copy">
              <div className="db-settings-row-title">Face photo for AI matching</div>
              <div className="db-settings-row-desc">
                {user?.has_face_encoding ? 'Face photo registered — AI matching is active' : 'No face photo yet — AI matching is inactive for your account'}
              </div>
            </div>
            <button className="db-settings-row-action" onClick={() => navigate('/signup?mode=update')}>
              {user?.has_face_encoding ? 'Update' : 'Add Photo'} <ArrowRight size={12} />
            </button>
          </div>
        </div>

        <div className="db-settings-section">
          <div className="db-settings-section-label">Security</div>
          <div className="db-settings-row">
            <div className="db-settings-row-icon"><Key size={16} /></div>
            <div className="db-settings-row-copy">
              <div className="db-settings-row-title">Authentication</div>
              <div className="db-settings-row-desc">Signed in with Google</div>
            </div>
            <div className="db-settings-row-value db-settings-enabled">Active</div>
          </div>
        </div>

        <div className="db-settings-section">
          <div className="db-settings-section-label">Session</div>
          <div className="db-settings-row">
            <div className="db-settings-row-icon" style={{ color: 'rgba(239, 68, 68, 0.7)' }}><LogOut size={16} /></div>
            <div className="db-settings-row-copy">
              <div className="db-settings-row-title">Sign out</div>
              <div className="db-settings-row-desc">Sign out from all sessions on this device</div>
            </div>
            <button className="db-settings-row-action db-settings-row-danger" onClick={logout}>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AI Image Generation Tab ──────────────────────────────────────────────────
function AIGenerateTab({ gallery, token, onImageGenerated }) {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [loading, setLoading] = useState(false);
  const [resultPhoto, setResultPhoto] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setResultPhoto(null);

    try {
      const res = await axios.post(
        `${API_BASE_URL}/ai/generate-to-gallery`,
        {
          gallery_id: gallery.id,
          prompt: prompt.trim(),
          aspect_ratio: aspectRatio,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.data.status === 'success') {
        setResultPhoto(res.data.photo);
        setPrompt('');
        if (onImageGenerated) {
          onImageGenerated();
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to generate image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="db-photos-panel" style={{ maxWidth: '600px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-serif)', color: 'var(--text)', marginBottom: '0.5rem' }}>
          Generate AI Photo with Imagen 3
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Create high-resolution AI art or custom photos and save them directly into this collection.
        </p>
      </div>

      <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="db-form-group">
          <label className="db-label" htmlFor="ai-prompt">Image Prompt</label>
          <textarea
            id="ai-prompt"
            className="db-input"
            rows={4}
            placeholder="e.g. A gorgeous bridal bouquet with pastel pink roses and eucalyptus leaves, sitting on a rustic wooden table, cinematic lighting, 8k..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            style={{ resize: 'none', minHeight: '100px', padding: '12px' }}
            disabled={loading}
          />
        </div>

        <div className="db-form-group">
          <label className="db-label">Aspect Ratio</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {[
              { val: '1:1', label: 'Square (1:1)' },
              { val: '3:4', label: 'Portrait (3:4)' },
              { val: '4:3', label: 'Landscape (4:3)' },
            ].map(({ val, label }) => (
              <button
                key={val}
                type="button"
                className={`db-btn-ghost-sm ${aspectRatio === val ? 'active' : ''}`}
                onClick={() => setAspectRatio(val)}
                disabled={loading}
                style={{
                  border: aspectRatio === val ? '1px solid var(--gold)' : '1px solid var(--border-strong)',
                  background: aspectRatio === val ? 'rgba(201, 169, 110, 0.08)' : 'transparent',
                  color: aspectRatio === val ? 'var(--gold)' : 'var(--text-muted)',
                  height: '40px',
                  borderRadius: '6px'
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ color: 'rgba(239, 68, 68, 0.9)', fontSize: '0.85rem', display: 'flex', gap: '6px', alignItems: 'center' }}>
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          className="db-btn-primary"
          disabled={loading || !prompt.trim()}
          style={{ height: '46px', width: '100%', justifyContent: 'center' }}
        >
          {loading ? (
            <>
              <span className="db-spinner" style={{ marginRight: '8px' }} />
              Generating with Imagen 3...
            </>
          ) : (
            <>
              <Sparkles size={16} style={{ marginRight: '8px' }} />
              Generate Image
            </>
          )}
        </button>
      </form>

      {resultPhoto && (
        <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid var(--border-strong)', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', textAlign: 'center' }} className="animate-fade-in">
          <div style={{ fontSize: '0.85rem', color: 'var(--gold)', fontWeight: '500', marginBottom: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
            <Check size={14} /> Generated & Saved Successfully!
          </div>
          <img
            src={resultPhoto.url}
            alt="AI Generated result"
            style={{ width: '100%', maxHeight: '320px', objectFit: 'contain', borderRadius: '6px', border: '1px solid var(--border-strong)', marginBottom: '1rem' }}
          />
          <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '6px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>AI Description</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text)', marginBottom: '10px' }}>{resultPhoto.description}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>AI Tags</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gold)' }}>{resultPhoto.tags}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Collection detail view ───────────────────────────────────────────────────
function CollectionDetail({ gallery, onBack, token }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upload');
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [favoritingId, setFavoritingId] = useState(null);
  const [favOnly, setFavOnly] = useState(false);

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/gallery/${gallery.id}/photos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPhotos(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const toggleFav = async (photo) => {
    setFavoritingId(photo.id);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/gallery/${gallery.id}/photos/${photo.id}/favorite`,
        {}, { headers: { Authorization: `Bearer ${token}` } }
      );
      setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, is_favorite: res.data.is_favorite } : p));
    } catch (err) { console.error(err); }
    finally { setFavoritingId(null); }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/gallery/${gallery.access_link}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayed = favOnly ? photos.filter(p => p.is_favorite) : photos;

  return (
    <div className="db-detail-root">
      <div className="db-detail-topbar">
        <button className="db-back-btn" onClick={onBack}>
          <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
          <span>Collections</span>
        </button>
        <div className="db-detail-title-row">
          <h1 className="db-detail-title">{gallery.name}</h1>
        </div>
        <div className="db-detail-actions">
          <button className="db-btn-ghost-sm" onClick={copyLink}>
            <Copy size={13} />{copied ? 'Copied!' : 'Copy Link'}
          </button>
          <button className="db-btn-ghost-sm" onClick={() => setShowQR(true)}>
            <QrCode size={13} />Show QR
          </button>
          <button className="db-btn-ghost-sm" onClick={() => navigate(`/gallery/${gallery.access_link}`)}>
            <ExternalLink size={13} />Preview
          </button>
        </div>
      </div>

      <div className="db-detail-tabs">
        {[
          { id: 'upload', icon: Camera, label: 'Upload Photos' },
          { id: 'photos', icon: Image, label: 'Photos & Favorites' },
          { id: 'ai-generate', icon: Sparkles, label: 'Generate AI Photo' },
        ].map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            className={`db-tab ${activeTab === id ? 'active' : ''}`}
            onClick={() => { setActiveTab(id); if (id === 'photos') fetchPhotos(); }}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      <div className="db-detail-content">
        {activeTab === 'upload' && <GalleryUploader gallery={gallery} />}
        {activeTab === 'ai-generate' && (
          <AIGenerateTab gallery={gallery} token={token} onImageGenerated={fetchPhotos} />
        )}
        {activeTab === 'photos' && (
          <div className="db-photos-panel">
            <div className="db-photos-controls">
              <span className="db-photos-count">
                {favOnly ? `${photos.filter(p => p.is_favorite).length} favorites` : `${photos.length} photos`}
              </span>
              <button className={`db-btn-ghost-sm ${favOnly ? 'active' : ''}`} onClick={() => setFavOnly(v => !v)}>
                <Heart size={13} fill={favOnly ? 'currentColor' : 'none'} />
                {favOnly ? 'Show all' : 'Favorites only'}
              </button>
            </div>
            {loading ? (
              <div className="db-loading">Loading photos...</div>
            ) : displayed.length === 0 ? (
              <div className="db-empty-photos">
                {photos.length === 0 ? 'No photos yet. Upload from the Upload tab.' : 'No favorites marked yet.'}
              </div>
            ) : (
              <div className="db-photo-grid">
                {displayed.map(photo => {
                  const thumb = photo.url.includes('/upload/')
                    ? photo.url.replace('/upload/', '/upload/c_fill,w_320,h_320,q_auto/')
                    : photo.url;
                  return (
                    <div key={photo.id} className="db-photo-item">
                      <img src={thumb} alt="" loading="lazy" className="db-photo-img" />
                      <button
                        className={`db-fav-btn ${photo.is_favorite ? 'active' : ''}`}
                        onClick={() => toggleFav(photo)}
                        disabled={favoritingId === photo.id}
                        aria-label={photo.is_favorite ? 'Remove favorite' : 'Mark as favorite'}
                      >
                        <Heart size={13} fill={photo.is_favorite ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {showQR && <QRModal galleryName={gallery.name} accessLink={gallery.access_link} onClose={() => setShowQR(false)} />}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function GalleryDashboard() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const [galleries, setGalleries] = useState([]);
  const [subStatus, setSubStatus] = useState(null);
  const [activeGallery, setActiveGallery] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [qrGallery, setQrGallery] = useState(null);
  const [activeNav, setActiveNav] = useState('collections');
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (token) fetchAll();
  }, [token]);

  const fetchAll = async () => {
    setLoadingData(true);
    try {
      const [galRes, subRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/gallery/my`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/subscription/status`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setGalleries(galRes.data);
      setSubStatus(subRes.data);
    } catch (err) { console.error(err); }
    finally { setLoadingData(false); }
  };

  const deleteGallery = async (gallery) => {
    try {
      await axios.delete(`${API_BASE_URL}/gallery/delete/${gallery.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConfirmDelete(null);
      if (activeGallery?.id === gallery.id) setActiveGallery(null);
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete collection');
    }
  };

  const usagePercent = subStatus
    ? Math.min(100, (subStatus.owned_galleries / subStatus.allowed_galleries) * 100)
    : 0;
  const atLimit = subStatus && subStatus.owned_galleries >= subStatus.allowed_galleries;
  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '??';

  const sidebarProps = {
    user, initials, subStatus, usagePercent, activeNav, setActiveNav,
    setActiveGallery, navigate, logout, atLimit,
  };

  // Collection detail view
  if (activeGallery) {
    return (
      <div className="db-root">
        <Sidebar {...sidebarProps} />
        <main className="db-main">
          <CollectionDetail gallery={activeGallery} onBack={() => setActiveGallery(null)} token={token} />
        </main>
      </div>
    );
  }

  // Main canvas content based on active nav
  const renderCanvas = () => {
    if (activeNav === 'settings') {
      return (
        <>
          <div className="db-canvas-body">
            <SettingsPanel navigate={navigate} />
          </div>
        </>
      );
    }

    if (activeNav === 'account') {
      return (
        <>
          <div className="db-canvas-body">
            <AccountPanel user={user} navigate={navigate} logout={logout} />
          </div>
        </>
      );
    }

    // Collections (default)
    return (
      <>
        {/* Canvas header — New Collection always visible */}
        <header className="db-canvas-header">
          <div className="db-canvas-header-left">
            <div className="db-canvas-eyebrow">Your workspace</div>
            <h1 className="db-canvas-title">Collections</h1>
          </div>
          <div className="db-canvas-header-right">
            {/* Always show New Collection — disabled if at limit */}
            <button
              id="dashboard-new-collection"
              className="db-btn-primary"
              onClick={() => setShowNewModal(true)}
              disabled={atLimit}
              title={atLimit ? 'Upgrade your plan to create more collections' : undefined}
            >
              <Plus size={16} />
              New Collection
            </button>
            <button className="db-btn-ghost-sm" onClick={() => navigate('/subscribe')}>
              {atLimit ? 'Upgrade Plan' : 'Manage Plan'}
            </button>
          </div>
        </header>

        {/* Collections canvas */}
        <div className="db-canvas-body">
          {loadingData ? (
            <div className="db-loading-state"><div className="db-spinner-lg" /></div>
          ) : galleries.length === 0 ? (
            // ── Empty state ─────────────────────────────────────────────────
            <div className="db-empty-root">
              <div className="db-empty-bg" style={{ backgroundImage: `url(${ghostBg})` }} />
              <div className="db-empty-content">
                <div className="db-empty-icon"><FolderOpen size={32} /></div>
                <h2 className="db-empty-h2">Your first collection<br />starts here.</h2>
                <p className="db-empty-body">
                  Create a collection, upload your event photos, and share a single QR code.
                  Guests find themselves in seconds.
                </p>
                {!atLimit ? (
                  <button
                    id="empty-state-new-collection"
                    className="db-btn-primary db-btn-primary-lg"
                    onClick={() => setShowNewModal(true)}
                  >
                    <Plus size={18} />
                    Create Your First Collection
                  </button>
                ) : (
                  <button className="db-btn-ghost-sm" onClick={() => navigate('/subscribe')}>
                    Upgrade to create collections
                  </button>
                )}
                <div className="db-empty-ghost-wrap">
                  <div className="db-empty-ghost-label">Here's what a collection looks like:</div>
                  <GhostCollectionCard />
                </div>
              </div>
            </div>
          ) : (
            // ── Populated grid ───────────────────────────────────────────────
            <div className="db-collection-grid">
              {galleries.map(gallery => (
                <CollectionCard
                  key={gallery.id}
                  gallery={gallery}
                  onOpen={setActiveGallery}
                  onQR={setQrGallery}
                  onDelete={setConfirmDelete}
                />
              ))}
              {/* Persistent ghost "new" card */}
              {!atLimit && <AddCollectionCard onClick={() => setShowNewModal(true)} />}
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="db-root">
      <Sidebar {...sidebarProps} />
      <main className="db-main">
        {renderCanvas()}
      </main>

      {/* Modals */}
      {showNewModal && (
        <NewCollectionModal
          onClose={() => setShowNewModal(false)}
          onCreated={fetchAll}
        />
      )}
      {confirmDelete && (
        <DeleteModal gallery={confirmDelete} onConfirm={deleteGallery} onCancel={() => setConfirmDelete(null)} />
      )}
      {qrGallery && (
        <QRModal galleryName={qrGallery.name} accessLink={qrGallery.access_link} onClose={() => setQrGallery(null)} />
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ user, initials, subStatus, usagePercent, activeNav, setActiveNav, setActiveGallery, navigate, logout, atLimit }) {
  const NAV = [
    { id: 'collections', icon: FolderOpen, label: 'Collections' },
    { id: 'settings', icon: Settings, label: 'Settings' },
    { id: 'account', icon: User, label: 'Account' },
  ];

  return (
    <aside className="db-sidebar">
      {/* Wordmark */}
      <div className="db-sidebar-brand">
        <div className="db-sidebar-logo">Fr<span className="db-gold">a</span>my</div>
      </div>

      {/* Nav */}
      <nav className="db-sidebar-nav" aria-label="Dashboard navigation">
        {NAV.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            id={`nav-${id}`}
            className={`db-nav-item ${activeNav === id ? 'active' : ''}`}
            onClick={() => {
              setActiveNav(id);
              if (setActiveGallery) setActiveGallery(null);
            }}
            aria-current={activeNav === id ? 'page' : undefined}
          >
            <Icon size={17} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      {/* Plan usage */}
      {subStatus && (
        <div className="db-sidebar-usage">
          <div className="db-usage-header">
            <span className="db-usage-label">Collections</span>
            <span className="db-usage-count">{subStatus.owned_galleries}/{subStatus.allowed_galleries}</span>
          </div>
          <div className="db-usage-track">
            <div
              className={`db-usage-fill ${atLimit ? 'at-limit' : ''}`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          {atLimit ? (
            <button className="db-sidebar-upgrade" onClick={() => navigate('/subscribe')}>
              <Zap size={12} /> Upgrade Plan
            </button>
          ) : (
            <div className="db-usage-note">{subStatus.allowed_galleries - subStatus.owned_galleries} remaining</div>
          )}
        </div>
      )}

      {/* User row */}
      <div className="db-sidebar-user">
        <div className="db-user-avatar-wrap">
          <div className="db-user-avatar">{initials}</div>
          {user && !user.has_face_encoding && (
            <div
              className="db-face-nudge"
              title="Add your face photo to enable AI matching"
              onClick={() => navigate('/signup?mode=update')}
              role="button"
              tabIndex={0}
              aria-label="Add face photo"
            >
              <UserCircle2 size={11} />
            </div>
          )}
        </div>
        <div className="db-user-info">
          <div className="db-user-name">{user?.name || 'Photographer'}</div>
          <div className="db-user-sub">{user?.email || ''}</div>
        </div>
        <button className="db-logout-btn" onClick={logout} title="Sign out" aria-label="Sign out">
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}
