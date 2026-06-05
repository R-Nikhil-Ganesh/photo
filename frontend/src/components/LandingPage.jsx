import React, { useEffect, useRef, useState, useCallback } from 'react';
import './LandingPage.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Search, QrCode, Download, Camera, Check, ArrowRight, Zap, Shield, Star, ChevronDown, User } from 'lucide-react';
import phoneGalleryUi from '../assets/phone_gallery_ui.png';

// ─── Intersection Observer hook for scroll animations ─────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return [ref, inView];
}

// ─── Plan data ────────────────────────────────────────────────────────────────
const PLANS = [
  { id: 'basic', name: 'Basic', collections: 1, price: 50, popular: false,
    features: ['1 event collection', 'Up to 200 photos', 'AI face matching', 'Guest share link', 'QR code access'] },
  { id: 'starter', name: 'Starter', collections: 2, price: 120, popular: false,
    features: ['2 event collections', 'Up to 200 photos each', 'AI face matching', 'Guest share links', 'QR code access'] },
  { id: 'pro', name: 'Pro', collections: 5, price: 299, popular: true,
    features: ['5 event collections', 'Up to 200 photos each', 'AI face matching', 'Guest share links', 'Bulk downloads', 'Priority support'] },
  { id: 'studio', name: 'Studio', collections: 15, price: 799, popular: false,
    features: ['15 event collections', 'Up to 200 photos each', 'AI face matching', 'Unlimited share links', 'Bulk zip downloads', 'Priority support', 'Dedicated onboarding'] },
];

// ─── Main LandingPage component ───────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [activePlan, setActivePlan] = useState('pro');
  const heroRef = useRef(null);

  // States for interactive mockup demonstrations
  const [deepDiveTab, setDeepDiveTab] = useState('all');
  const [faceMatchStep, setFaceMatchStep] = useState('scan');

  // Auto-toggle faceMatchStep every 4 seconds for dynamic simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setFaceMatchStep((prev) => (prev === 'scan' ? 'matched' : 'scan'));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Cursor-tracking glow effect on hero
  const onMouseMove = useCallback((e) => {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const handleViewExample = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await axios.post(`${API_URL}/samples/seed`);
      navigate(`/gallery/${res.data.access_link}`);
    } catch {
      navigate('/gallery/framy-demo-sample');
    }
  };

  const [heroRef2, heroIn] = useInView(0.1);
  const [trustRef, trustIn] = useInView(0.15);
  const [productRef, productIn] = useInView(0.1);
  const [stepsRef, stepsIn] = useInView(0.1);
  const [testimonialsRef, testimonialsIn] = useInView(0.1);
  const [pricingRef, pricingIn] = useInView(0.1);
  const [ctaRef, ctaIn] = useInView(0.2);

  return (
    <div className="lp-root">

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        onMouseMove={onMouseMove}
        className="lp-hero"
        style={{ '--mouse-x': `${mousePos.x}px`, '--mouse-y': `${mousePos.y}px` }}
      >
        <div className="lp-hero-bg-texture" />
        <div className="lp-hero-cursor-glow" />

        <div className="lp-container">
          <div ref={heroRef2} className={`lp-hero-grid ${heroIn ? 'lp-in' : ''}`}>

            {/* Left Column: Heading, Sub, CTAs, and Trust Strip */}
            <div className="lp-hero-content">
              {/* Eyebrow pill */}
              <div className="lp-eyebrow-pill">
                <Zap size={11} />
                AI-powered photo delivery for live events
              </div>

              {/* Headline */}
              <h1 className="lp-hero-h1">
                Your guests find<br />
                themselves <em>instantly.</em><br />
                <span className="lp-hero-h1-muted">You stay behind the lens.</span>
              </h1>

              {/* Sub */}
              <p className="lp-hero-sub">
                Framy turns event folders into searchable private galleries with AI face matching,
                QR access, and instant delivery — without any guest app downloads.
              </p>

              {/* CTA row */}
              <div className="lp-hero-ctas">
                <button id="hero-cta-primary" onClick={() => navigate('/signup')} className="lp-btn-primary lp-btn-lg">
                  Start a Collection
                  <ArrowRight size={16} />
                </button>
                <button id="hero-cta-sample" onClick={handleViewExample} className="lp-btn-ghost lp-btn-lg">
                  Open Sample Gallery
                </button>
              </div>

              {/* Trust signal strip */}
              <div className="lp-hero-trust">
                <div className="lp-hero-trust-item">
                  <Shield size={13} />
                  No app download needed
                </div>
                <div className="lp-hero-trust-sep" />
                <div className="lp-hero-trust-item">
                  <Zap size={13} />
                  Live in under 10 min
                </div>
                <div className="lp-hero-trust-sep" />
                <div className="lp-hero-trust-item">
                  <Star size={13} />
                  Plans from Rs 50
                </div>
              </div>
            </div>

            {/* Right Column: Clean phone UI mockup of guest gallery */}
            <div className="lp-hero-mockup-wrapper">
              <div className="lp-phone-container">
                <div className="lp-phone-bezel">
                  <div className="lp-phone-speaker" />
                  <div className="lp-phone-screen">
                    <img 
                      src={phoneGalleryUi} 
                      alt="Framy guest gallery UI on phone" 
                      className="lp-phone-screen-img"
                    />
                  </div>
                </div>
                <div className="lp-phone-accent-glow" />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── REAL CAPABILITY CLAIMS BAR ──────────────────────────────────────── */}
      <section ref={trustRef} className={`lp-claims-bar ${trustIn ? 'lp-in' : ''}`}>
        <div className="lp-container">
          <div className="lp-claims-inner">
            <div className="lp-claims-item">
              <Zap size={16} />
              <span>Processes 500 photos in under 2 minutes</span>
            </div>
            <div className="lp-claims-sep" />
            <div className="lp-claims-item">
              <Shield size={16} />
              <span>No app download for guests</span>
            </div>
            <div className="lp-claims-sep" />
            <div className="lp-claims-item">
              <Camera size={16} />
              <span>Works on any phone</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROBLEM / PROMISE ──────────────────────────────────────────────── */}
      <section className="lp-section lp-problem">
        <div className="lp-container">
          <div className="lp-problem-grid">
            <div className="lp-problem-left">
              <div className="lp-section-eyebrow">The photographer's problem</div>
              <h2 className="lp-section-h2">
                Delivering photos<br />is broken.
              </h2>
              <p className="lp-section-body">
                You shoot 800 frames at a wedding. Then spend hours culling, exporting, uploading
                to a generic gallery link, emailing it to a coordinator, and answering "which one am I in?" 
                for the next two weeks.
              </p>
              <p className="lp-section-body" style={{ marginTop: '1rem' }}>
                Your craft deserves better. So do your clients.
              </p>
            </div>
            <div className="lp-problem-right">
              <div className="lp-problem-before">
                <div className="lp-problem-label lp-problem-label-before">Before Framy</div>
                {['Export to Google Drive', 'Email 200+ guests individually', 'Field "find my photo" requests for weeks', 'Generic gallery, no face search', 'Guests scroll 800 photos for their 12'].map((item, i) => (
                  <div key={i} className="lp-problem-row lp-problem-row-bad">
                    <span className="lp-problem-x">✕</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <div className="lp-problem-arrow">↓</div>
              <div className="lp-problem-after">
                <div className="lp-problem-label lp-problem-label-after">After Framy</div>
                {['Upload once, share one QR', 'Guests find themselves in seconds', 'No support emails, ever', 'Private, branded gallery', 'Full-res downloads, already organized'].map((item, i) => (
                  <div key={i} className="lp-problem-row lp-problem-row-good">
                    <span className="lp-problem-check">✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS (HORIZONTAL TIMELINE) ───────────────────────────────── */}
      <section ref={stepsRef} className={`lp-section lp-steps-section ${stepsIn ? 'lp-in' : ''}`}>
        <div className="lp-container">
          <div className="lp-section-header lp-text-center">
            <div className="lp-section-eyebrow">How it works</div>
            <h2 className="lp-section-h2">From upload to delivery<br /><em>in four steps</em></h2>
          </div>
          
          <div className="lp-timeline-container">
            <div className="lp-timeline-track" />
            <div className="lp-steps-horizontal">
              
              {/* Step 1 */}
              <div className="lp-step-card-horiz" style={{ '--delay': '0ms' }}>
                <div className="lp-step-marker">
                  <span className="lp-step-marker-number">1</span>
                </div>
                <div className="lp-step-content-box">
                  <h3 className="lp-step-title">Upload your gallery</h3>
                  
                  {/* Step 1 Mini UI snippet */}
                  <div className="lp-mini-ui lp-mini-upload">
                    <div className="lp-mini-upload-box">
                      <div className="lp-mini-upload-icon">↑</div>
                      <div className="lp-mini-upload-text">wedding_raw_842.zip</div>
                      <div className="lp-mini-progress-bar">
                        <div className="lp-mini-progress-fill" />
                      </div>
                      <div className="lp-mini-progress-pct">74% · Scanning faces</div>
                    </div>
                  </div>
                  
                  <p className="lp-step-body">Drop your event photos in. Framy scans every face during upload — no extra work on your end.</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="lp-step-card-horiz" style={{ '--delay': '120ms' }}>
                <div className="lp-step-marker">
                  <span className="lp-step-marker-number">2</span>
                </div>
                <div className="lp-step-content-box">
                  <h3 className="lp-step-title">Share one link or QR</h3>
                  
                  {/* Step 2 Mini UI snippet */}
                  <div className="lp-mini-ui lp-mini-share">
                    <div className="lp-mini-browser">
                      <div className="lp-mini-dots"><span /><span /><span /></div>
                      <div className="lp-mini-url">framy.co/sharma-wedding</div>
                    </div>
                    <div className="lp-mini-qr">
                      <div className="lp-mini-qr-code" />
                      <span className="lp-mini-qr-label">Scan to View</span>
                    </div>
                  </div>
                  
                  <p className="lp-step-body">Print a QR or drop a link in the event chat. Guests tap and go — no app download, no account needed.</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="lp-step-card-horiz" style={{ '--delay': '240ms' }}>
                <div className="lp-step-marker">
                  <span className="lp-step-marker-number">3</span>
                </div>
                <div className="lp-step-content-box">
                  <h3 className="lp-step-title">Guests find themselves</h3>
                  
                  {/* Step 3 Mini UI snippet */}
                  <div className="lp-mini-ui lp-mini-find">
                    <div className="lp-mini-scan-circle">
                      <div className="lp-mini-scan-avatar">
                        <User size={18} />
                      </div>
                      <div className="lp-mini-scan-ring" />
                    </div>
                    <div className="lp-mini-scan-badge">Matching...</div>
                  </div>
                  
                  <p className="lp-step-body">Each guest takes a quick selfie. Face match shows them only their photos, filtered instantly.</p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="lp-step-card-horiz" style={{ '--delay': '360ms' }}>
                <div className="lp-step-marker">
                  <span className="lp-step-marker-number">4</span>
                </div>
                <div className="lp-step-content-box">
                  <h3 className="lp-step-title">Everyone downloads</h3>
                  
                  {/* Step 4 Mini UI snippet */}
                  <div className="lp-mini-ui lp-mini-download-grid">
                    <div className="lp-mini-grid-item lp-item-col-1" />
                    <div className="lp-mini-grid-item lp-item-col-2" />
                    <div className="lp-mini-grid-item lp-mini-grid-selected lp-item-col-3">
                      <div className="lp-mini-grid-check">✓</div>
                    </div>
                    <div className="lp-mini-grid-item lp-item-col-4" />
                  </div>
                  
                  <p className="lp-step-body">Full-res downloads, favorites, sharing — all handled. You stay focused on the next shoot.</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ── PRODUCT DEEP-DIVE (CSS INTERACTIVE MOCKUPS) ───────────────────────── */}
      <section ref={productRef} className={`lp-section lp-product ${productIn ? 'lp-in' : ''}`}>
        <div className="lp-container">
          
          {/* Feature 1 — Face match */}
          <div className="lp-product-row">
            <div className="lp-product-copy">
              <div className="lp-section-eyebrow">AI face matching</div>
              <h2 className="lp-section-h2">
                Guests find<br /><em>their moment</em><br />in seconds.
              </h2>
              <p className="lp-section-body">
                No more "scroll through 800 photos to find yourself." Guests tap Find Me, take a quick 
                selfie, and Framy's face matching surfaces every photo they appear in — instantly. 
                Private, secure, and no account required.
              </p>
              <div className="lp-feature-tags">
                <div className="lp-feature-tag"><Check size={12} /> Works on any phone</div>
                <div className="lp-feature-tag"><Check size={12} /> No app download</div>
                <div className="lp-feature-tag"><Check size={12} /> Runs in the browser</div>
              </div>
            </div>
            
            <div className="lp-product-visual">
              <div className="lp-product-screen-css">
                <div className="lp-product-screen-header">
                  <div className="lp-product-screen-dots"><span /><span /><span /></div>
                  <span className="lp-product-screen-title">AI Matcher</span>
                </div>
                <div className="lp-product-screen-content lp-facematch-screen">
                  
                  {faceMatchStep === 'scan' ? (
                    <div className="lp-scan-view">
                      <div className="lp-scan-frame-wrapper">
                        <div className="lp-scan-silhouette-svg">
                          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M50 15C38.9543 15 30 23.9543 30 35C30 43.1554 34.8587 50.1772 41.8125 53.2188C35.0506 56.4023 30.3125 63.1523 30.3125 71C30.3125 72.6569 31.6556 74 33.3125 74H66.6875C68.3444 74 69.6875 72.6569 69.6875 71C69.6875 63.1523 64.9494 56.4023 58.1875 53.2188C65.1413 50.1772 70 43.1554 70 35C70 23.9543 61.0457 15 50 15Z" stroke="#c9a96e" strokeWidth="2.5" strokeLinecap="round" />
                          </svg>
                        </div>
                        <div className="lp-scan-circle-glow" />
                        <div className="lp-scan-laser-line" />
                      </div>
                      <div className="lp-scan-status-text">Analyzing face geometry...</div>
                    </div>
                  ) : (
                    <div className="lp-matched-view">
                      <div className="lp-matched-header">
                        <div className="lp-matched-success-icon">✓</div>
                        <h4 className="lp-matched-heading">Found 12 photos of you</h4>
                        <p className="lp-matched-subheading">Filtered from 842 event photos</p>
                      </div>
                      <div className="lp-matched-results-grid">
                        <div className="lp-matched-grid-img lp-img-pattern-1" />
                        <div className="lp-matched-grid-img lp-img-pattern-2" />
                        <div className="lp-matched-grid-img lp-img-pattern-3" />
                        <div className="lp-matched-grid-img lp-img-pattern-4" />
                      </div>
                      <button className="lp-matched-action-btn">View My Photos</button>
                    </div>
                  )}

                </div>
                <div className="lp-product-screen-badge">
                  <Zap size={11} />
                  Self-serve Flow Demo
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2 — Gallery + QR */}
          <div className="lp-product-row lp-product-row-flip">
            <div className="lp-product-copy">
              <div className="lp-section-eyebrow">Private gallery access</div>
              <h2 className="lp-section-h2">
                One QR code.<br /><em>Every guest.</em><br />Zero friction.
              </h2>
              <p className="lp-section-body">
                Print the QR at the venue entrance or drop the link in the event chat. Guests access 
                the private gallery, find their photos, save favorites, and download full-resolution 
                images — all without creating an account.
              </p>
              <div className="lp-feature-tags">
                <div className="lp-feature-tag"><Check size={12} /> Private per-event link</div>
                <div className="lp-feature-tag"><Check size={12} /> Printable QR code</div>
                <div className="lp-feature-tag"><Check size={12} /> Full-res downloads</div>
              </div>
            </div>
            
            <div className="lp-product-visual">
              <div className="lp-product-screen-css">
                <div className="lp-product-screen-header">
                  <div className="lp-product-screen-dots"><span /><span /><span /></div>
                  <span className="lp-product-screen-title">sharma-wedding</span>
                </div>
                <div className="lp-product-screen-content lp-gallery-screen">
                  
                  {/* Gallery Nav Tabs */}
                  <div className="lp-gallery-tabs">
                    <button 
                      onClick={() => setDeepDiveTab('all')} 
                      className={`lp-gallery-tab-btn ${deepDiveTab === 'all' ? 'active' : ''}`}
                    >
                      All Photos (218)
                    </button>
                    <button 
                      onClick={() => setDeepDiveTab('mine')} 
                      className={`lp-gallery-tab-btn ${deepDiveTab === 'mine' ? 'active' : ''}`}
                    >
                      My Photos (12)
                    </button>
                  </div>

                  {/* Gallery Grid */}
                  <div className="lp-gallery-grid-preview">
                    {deepDiveTab === 'all' ? (
                      <>
                        <div className="lp-gallery-grid-img lp-img-pattern-1" />
                        <div className="lp-gallery-grid-img lp-img-pattern-2" />
                        <div className="lp-gallery-grid-img lp-img-pattern-3" />
                        <div className="lp-gallery-grid-img lp-img-pattern-4" />
                        <div className="lp-gallery-grid-img lp-img-pattern-5" />
                        <div className="lp-gallery-grid-img lp-img-pattern-6" />
                      </>
                    ) : (
                      <>
                        <div className="lp-gallery-grid-img lp-img-pattern-2"><div className="lp-match-tag">98% match</div></div>
                        <div className="lp-gallery-grid-img lp-img-pattern-4"><div className="lp-match-tag">96% match</div></div>
                        <div className="lp-gallery-grid-img lp-img-pattern-5"><div className="lp-match-tag">92% match</div></div>
                        <div className="lp-gallery-empty-fill" />
                        <div className="lp-gallery-empty-fill" />
                        <div className="lp-gallery-empty-fill" />
                      </>
                    )}
                  </div>
                  
                  {/* Floating Action Strip */}
                  <div className="lp-gallery-footer-strip">
                    <span className="lp-gallery-selected-count">
                      {deepDiveTab === 'all' ? '218 photos' : '3 photos selected'}
                    </span>
                    <button className="lp-gallery-download-btn">
                      ↓ Download Full-Res
                    </button>
                  </div>

                </div>
                <div className="lp-product-screen-badge">
                  <QrCode size={11} />
                  Guest Gallery view
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOUNDER STORY & TRACTION (REPLACES FAKE TESTIMONIALS) ─────────────── */}
      <section ref={testimonialsRef} className={`lp-section lp-story-section ${testimonialsIn ? 'lp-in' : ''}`}>
        <div className="lp-container">
          <div className="lp-story-grid">
            
            {/* Left Column: Founder Note */}
            <div className="lp-story-founder">
              <div className="lp-section-eyebrow">Why we built this</div>
              <h2 className="lp-section-h2">Authentic beats polished.</h2>
              <p className="lp-story-text">
                As event photographers, we spent years watching beautiful, high-pressure shoots get followed by weeks of delivery chaos. 
                Google Drive links got lost, coordinators were overwhelmed with requests, and guests continually emailed us asking to find their photos. 
                We built Framy to solve this exact bottleneck. It is not a bloated enterprise tool — it is a simple, fast pipeline that honors your work and respects your clients' time.
              </p>
              <div className="lp-founder-signature">
                <div className="lp-founder-avatar-initials">FG</div>
                <div>
                  <div className="lp-founder-name">The Framy Creators</div>
                  <div className="lp-founder-title">Photographers & Founders</div>
                </div>
              </div>
            </div>

            {/* Right Column: Single Real Quote Testimonial */}
            <div className="lp-story-testimonial">
              <div className="lp-testimonial-card-single">
                <div className="lp-testimonial-quote-mark">“</div>
                <blockquote className="lp-story-quote">
                  This would have saved me 3 hours after my last wedding shoot.
                </blockquote>
                <div className="lp-story-quote-author">
                  <div className="lp-quote-author-name">— Nikhil G</div>
                  <div className="lp-quote-author-title">Beta Tester & Wedding Photographer</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────────────────────────── */}
      <section ref={pricingRef} className={`lp-section lp-pricing ${pricingIn ? 'lp-in' : ''}`}>
        <div className="lp-container">
          <div className="lp-section-header lp-text-center">
            <div className="lp-section-eyebrow">Pricing</div>
            <h2 className="lp-section-h2">
              Simple, one-time pricing.<br /><em>No subscriptions.</em>
            </h2>
            <p className="lp-section-sub">
              Pay once per event cycle. Unlock more collections as you grow.
            </p>
          </div>
          <div className="lp-pricing-grid">
            {PLANS.map((plan) => {
              const isActive = activePlan === plan.id;
              return (
                <button
                  key={plan.id}
                  id={`plan-${plan.id}`}
                  className={`lp-plan-card ${isActive ? 'lp-plan-card-active' : ''} ${plan.popular ? 'lp-plan-card-popular' : ''}`}
                  onClick={() => setActivePlan(plan.id)}
                  aria-pressed={isActive}
                >
                  {plan.popular && <div className="lp-plan-badge">Most Popular</div>}
                  <div className="lp-plan-name">{plan.name}</div>
                  <div className="lp-plan-price">
                    <span className="lp-plan-currency">Rs</span>
                    <span className="lp-plan-amount">{plan.price}</span>
                    <span className="lp-plan-period">one-time</span>
                  </div>
                  <div className="lp-plan-collections">
                    {plan.collections} event collection{plan.collections > 1 ? 's' : ''}
                  </div>
                  <div className="lp-plan-divider" />
                  <ul className="lp-plan-features">
                    {plan.features.map((f, i) => (
                      <li key={i} className="lp-plan-feature">
                        <Check size={13} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className={`lp-plan-cta ${isActive ? 'lp-plan-cta-active' : ''}`}>
                    {isActive ? 'Selected' : 'Choose Plan'}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="lp-pricing-note">
            <Shield size={14} />
            Payment verified manually — you upload a screenshot after paying. No card stored.
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────────────────────────────────── */}
      <section ref={ctaRef} className={`lp-cta-section ${ctaIn ? 'lp-in' : ''}`}>
        <div className="lp-cta-glow" />
        <div className="lp-container">
          <div className="lp-cta-inner">
            <div className="lp-section-eyebrow lp-text-center">Ready to deliver differently?</div>
            <h2 className="lp-cta-h2">
              Your next event.<br /><em>Delivered in minutes.</em>
            </h2>
            <p className="lp-cta-sub">
              Start with one collection, free to explore. No credit card required.
            </p>
            <div className="lp-cta-actions">
              <button id="footer-cta-primary" onClick={() => navigate('/signup')} className="lp-btn-primary lp-btn-xl">
                Start a Collection
                <ArrowRight size={16} />
              </button>
              <button id="footer-cta-sample" onClick={handleViewExample} className="lp-btn-ghost lp-btn-lg">
                See a live example
                <ArrowRight size={14} />
              </button>
            </div>
            <div className="lp-cta-reassurance">
              <span><Check size={12} /> No credit card</span>
              <span><Check size={12} /> 5-minute setup</span>
              <span><Check size={12} /> Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-inner">
            <div className="lp-footer-brand">
              <div className="lp-footer-logo">Fr<span className="lp-gold">a</span>my</div>
              <p className="lp-footer-tagline">AI photo delivery for event photographers.</p>
            </div>
            <div className="lp-footer-links">
              <button className="lp-footer-link" onClick={() => navigate('/signup')}>Sign Up</button>
              <button className="lp-footer-link" onClick={() => navigate('/subscribe')}>Pricing</button>
              <button className="lp-footer-link" onClick={handleViewExample}>Demo Gallery</button>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <span>© 2025 Framy. All rights reserved.</span>
            <span>Built for photographers who care about delivery.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
