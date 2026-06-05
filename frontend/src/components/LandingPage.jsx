import React, { useEffect, useRef, useState, useCallback } from 'react';
import './LandingPage.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Search, QrCode, Download, Camera, Check, ArrowRight, Zap, Shield, Star, ChevronDown, User } from 'lucide-react';
import phoneGalleryUi from '../assets/phone_gallery_ui.png';

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
  const rootRef = useRef(null);
  const path1Ref = useRef(null);
  const path2Ref = useRef(null);
  const path3Ref = useRef(null);
  const path4Ref = useRef(null);
  const path5Ref = useRef(null);

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

  // ── Section reveal state ───────────────────────────────────────────────────
  // Declared BEFORE the ribbon useEffect so setters are in scope for the
  // scroll-driven checkpoint handler that references them via a stable ref.
  const [trustRevealed,        setTrustRevealed]        = useState(false);
  const [problemRevealed,      setProblemRevealed]      = useState(false);
  const [stepsRevealed,        setStepsRevealed]        = useState(false);
  const [productRevealed,      setProductRevealed]      = useState(false);
  const [testimonialsRevealed, setTestimonialsRevealed] = useState(false);
  const [pricingRevealed,      setPricingRevealed]      = useState(false);
  const [ctaRevealed,          setCtaRevealed]          = useState(false);

  // Section element refs
  const heroRef2        = useRef(null);
  const trustRef        = useRef(null);
  const problemRef      = useRef(null);
  const productRef      = useRef(null);
  const stepsRef        = useRef(null);
  const testimonialsRef = useRef(null);
  const pricingRef      = useRef(null);
  const ctaRef          = useRef(null);

  // Stable ref holding the checkpoint setter fns so the useEffect below
  // can call them without being added to its dependency array
  const revealSettersRef = useRef(null);
  revealSettersRef.current = {
    trust:        setTrustRevealed,
    problem:      setProblemRevealed,
    steps:        setStepsRevealed,
    product:      setProductRevealed,
    testimonials: setTestimonialsRevealed,
    pricing:      setPricingRevealed,
    cta:          setCtaRevealed,
  };

  // ── Ribbon animation: unified rAF state machine ──────────────────────────
  // ONE tick() loop handles all three phases so there can be no race conditions:
  //  • drawIn  — sweeps ribbons in from the right edge over ~2s
  //  • idle    — sin-wave spiral-pulse when the user hasn't scrolled yet
  //  • scroll  — extends the ribbon proportional to scroll position
  //
  // The scroll listener is attached IMMEDIATELY. Any scroll event switches the
  // phase to 'scroll' on the next tick — no setTimeout delay means no jump.
  // Section reveals use scroll-fraction thresholds (reliable, no getPointAtLength).
  useEffect(() => {
    const HERO_FRAC    = 0.08;           // fraction of path visible in the hero
    const DRAW_MS      = 1800;           // draw-in duration for the first ribbon
    const STAGGER      = [0, 160, 320, 80, 240]; // per-ribbon draw-in delay (ms)
    const ALL_DONE_MS  = DRAW_MS + 320 + 50;     // when last ribbon finishes

    const pathDefs = [
      { ref: path1Ref, lag: 0,    ampFrac: 0.12, speed: 0.85, wavePhase: 0                },
      { ref: path2Ref, lag: 0.03, ampFrac: 0.09, speed: 1.05, wavePhase: Math.PI * 0.4   },
      { ref: path3Ref, lag: 0.06, ampFrac: 0.14, speed: 0.75, wavePhase: Math.PI * 0.8   },
      { ref: path4Ref, lag: 0.02, ampFrac: 0.07, speed: 1.15, wavePhase: Math.PI * 0.2   },
      { ref: path5Ref, lag: 0.05, ampFrac: 0.10, speed: 0.95, wavePhase: Math.PI * 0.6   },
    ];

    let pathsReady = false;
    let paths = [];

    // Use getPointAtLength to precisely trigger section reveals based on
    // the true SVG Y-coordinate of the primary ribbon's tip.
    const CHECKPOINTS = [
      { key: 'trust',        svgY: 900  },
      { key: 'problem',      svgY: 1400 },
      { key: 'steps',        svgY: 2000 },
      { key: 'product',      svgY: 2600 },
      { key: 'testimonials', svgY: 3400 },
      { key: 'pricing',      svgY: 4000 },
      { key: 'cta',          svgY: 4700 },
    ];
    const revealed = new Set();

    const getActiveTargetFrac = () => {
      // Find the furthest section that has entered the middle of the viewport
      const scrollY = window.scrollY + window.innerHeight * 0.5;
      const sections = [
        { el: trustRef.current,        frac: 0.20 },
        { el: problemRef.current,      frac: 0.30 },
        { el: stepsRef.current,        frac: 0.45 },
        { el: productRef.current,      frac: 0.55 },
        { el: testimonialsRef.current, frac: 0.70 },
        { el: pricingRef.current,      frac: 0.85 },
        { el: ctaRef.current,          frac: 1.0  },
      ];
      let bestFrac = 0.0;
      for (const { el, frac } of sections) {
        if (el && scrollY >= el.offsetTop) {
          bestFrac = frac;
        }
      }
      return bestFrac;
    };

    const triggerCheckpoints = (drawnLength) => {
      const primaryEl = path1Ref.current;
      if (!primaryEl) return;
      try {
        const pt = primaryEl.getPointAtLength(Math.min(drawnLength, paths[0].total));
        CHECKPOINTS.forEach(({ key, svgY }) => {
          if (!revealed.has(key) && pt.y >= svgY) {
            revealed.add(key);
            revealSettersRef.current?.[key]?.(true);
          }
        });
      } catch (_) { /* ignore if SVG not ready */ }
    };

    // ── State machine ──────────────────────────────────────────────────────
    let phase          = 'drawIn'; // 'drawIn' | 'idle' | 'scroll'
    let drawInT0       = null;     // timestamp when drawIn started
    let idleT0         = null;     // timestamp when idle started
    let rafId;

    let targetFrac = 0;
    let currentFrac = 0;
    let lastTs = null;

    const tick = (ts) => {
      if (!lastTs) lastTs = ts;
      const dt = Math.min(ts - lastTs, 64); // cap dt at 64ms to prevent huge jumps on tab switch
      lastTs = ts;
      if (!pathsReady) {
        // Wait until all paths have a valid computed length (> 0).
        // On some browsers, getTotalLength() is 0 on the exact frame of mount.
        let allReady = true;
        paths = pathDefs.map((def, i) => {
          const el = def.ref.current;
          let total = 0;
          if (el && el.getTotalLength) {
            total = el.getTotalLength();
          }
          if (total === 0) {
            allReady = false;
          }
          return { ...def, el, total, heroOffset: total * (1 - HERO_FRAC), stagger: STAGGER[i] };
        });

        if (!allReady) {
          rafId = requestAnimationFrame(tick);
          return;
        }

        pathsReady = true;
        paths.forEach(p => {
          if (p.el) {
            p.el.style.strokeDasharray = p.total;
            p.el.style.strokeDashoffset = p.total;
          }
        });
      }

      if (phase === 'drawIn') {
        // ─ Sweep ribbons in from the right edge ─
        if (!drawInT0) drawInT0 = ts;
        const elapsed = ts - drawInT0;

        paths.forEach(({ el, total, heroOffset, stagger }) => {
          if (!el) return;
          const t = Math.max(0, elapsed - stagger) / DRAW_MS;
          // Ease-out cubic so the ribbon decelerates as it settles
          const eased  = 1 - Math.pow(1 - Math.min(t, 1), 3);
          el.style.strokeDashoffset = total - (total - heroOffset) * eased;
        });

        if (elapsed >= ALL_DONE_MS) {
          phase  = 'idle';
          idleT0 = null; // will be set on next idle frame
        }

      } else if (phase === 'idle') {
        // ─ Spiral-pulse: each ribbon oscillates with its own sin wave ─
        if (!idleT0) idleT0 = ts;
        const t = (ts - idleT0) / 1000; // seconds

        paths.forEach(({ el, total, heroOffset, ampFrac, speed, wavePhase }) => {
          if (!el) return;
          const amplitude = total * ampFrac;
          const wave      = Math.sin(t * speed + wavePhase);
          const offset    = heroOffset - amplitude * wave;
          el.style.strokeDashoffset = Math.max(0, Math.min(total * 0.95, offset));
        });

      } else {
        // ─ Checkpoint-driven: smoothly animate ribbon to active section's target ─
        const newTarget = getActiveTargetFrac();
        
        if (newTarget === 0.0 && targetFrac > 0.0) {
          // User scrolled all the way back up to hero. Fully reset the effect.
          targetFrac = 0;
          currentFrac = 0;
          revealed.clear();
          Object.values(revealSettersRef.current).forEach(setter => setter(false));
          phase = 'drawIn';
          drawInT0 = null;
          idleT0 = null;
        } else {
          // Only allow targetFrac to increase so the ribbon never retracts on scroll up
          targetFrac = Math.max(targetFrac, newTarget);
        }
        
        // Time-independent lerp currentFrac towards targetFrac
        const diff = targetFrac - currentFrac;
        // ~0.08 at 60fps (16ms)
        currentFrac += diff * (1 - Math.exp(-dt * 0.005));

        paths.forEach(({ el, lag, heroOffset }) => {
          if (!el) return;
          // Each ribbon has a slight lag so they arrive sequentially
          const progress = Math.min(Math.max(currentFrac - lag, 0) / (1 - lag), 1);
          el.style.strokeDashoffset = heroOffset * (1 - progress);
        });

        // Trigger checkpoints using the primary ribbon's current drawn length
        if (paths[0]) {
          const primaryProgress = Math.min(Math.max(currentFrac - paths[0].lag, 0) / (1 - paths[0].lag), 1);
          const drawnLength = paths[0].total - (paths[0].heroOffset * (1 - primaryProgress));
          triggerCheckpoints(drawnLength);
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    // Switch to scroll phase on any scroll — happens BEFORE the setTimeout
    // fired in the old code, so no more jump-to-bottom on early scroll.
    const onScroll = () => { phase = 'scroll'; };

    rafId = requestAnimationFrame(tick);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
    };
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

  // Convenient aliases used in JSX
  const heroIn         = true;
  const trustIn        = trustRevealed;
  const problemIn      = problemRevealed;
  const stepsIn        = stepsRevealed;
  const productIn      = productRevealed;
  const testimonialsIn = testimonialsRevealed;
  const pricingIn      = pricingRevealed;
  const ctaIn          = ctaRevealed;

  return (
    <div className="lp-root" ref={rootRef}>

      {/* ── FULL-PAGE RIBBON SVG OVERLAY ──────────────────────────────────── */}
      {/* viewBox: 1440 wide × 5400 tall. Paths originate from x=1440 (right
          screen edge) and spiral inward-leftward across the full page height.
          The hero draw-in brings the ribbon onto screen from the edge. Scroll
          then extends it section by section like a pen drawing the page. */}
      <svg
        className="lp-ribbon-canvas"
        viewBox="0 0 1440 5400"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="rb-grad-1" x1="1440" y1="300" x2="480" y2="5100" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#fffdf5" stopOpacity="1"   />
            <stop offset="6%"   stopColor="#f5d898" stopOpacity="0.95"/>
            <stop offset="22%"  stopColor="#c9a96e" stopOpacity="0.82"/>
            <stop offset="48%"  stopColor="#a07d45" stopOpacity="0.55"/>
            <stop offset="74%"  stopColor="#6b5028" stopOpacity="0.28"/>
            <stop offset="100%" stopColor="#050508" stopOpacity="0"  />
          </linearGradient>
          <linearGradient id="rb-grad-2" x1="1440" y1="380" x2="500" y2="5130" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#fff3d0" stopOpacity="0.9" />
            <stop offset="14%"  stopColor="#e8c97a" stopOpacity="0.8" />
            <stop offset="38%"  stopColor="#b59253" stopOpacity="0.58"/>
            <stop offset="68%"  stopColor="#7a5b28" stopOpacity="0.27"/>
            <stop offset="100%" stopColor="#050508" stopOpacity="0"  />
          </linearGradient>
          <linearGradient id="rb-grad-3" x1="1440" y1="200" x2="460" y2="5190" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#ffeebb" stopOpacity="0.75"/>
            <stop offset="18%"  stopColor="#d4a84b" stopOpacity="0.65"/>
            <stop offset="52%"  stopColor="#9b7535" stopOpacity="0.37"/>
            <stop offset="86%"  stopColor="#4a3518" stopOpacity="0.12"/>
            <stop offset="100%" stopColor="#050508" stopOpacity="0"  />
          </linearGradient>
          <linearGradient id="rb-grad-4" x1="1440" y1="320" x2="490" y2="5020" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#fff8e7" stopOpacity="1"   />
            <stop offset="11%"  stopColor="#e8c97a" stopOpacity="0.9" />
            <stop offset="42%"  stopColor="#9b7535" stopOpacity="0.48"/>
            <stop offset="78%"  stopColor="#5c4020" stopOpacity="0.18"/>
            <stop offset="100%" stopColor="#050508" stopOpacity="0"  />
          </linearGradient>
          <linearGradient id="rb-grad-5" x1="1440" y1="360" x2="510" y2="4940" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="1"   />
            <stop offset="9%"   stopColor="#fff3d0" stopOpacity="0.95"/>
            <stop offset="38%"  stopColor="#c9a96e" stopOpacity="0.65"/>
            <stop offset="73%"  stopColor="#7a5b28" stopOpacity="0.22"/>
            <stop offset="100%" stopColor="#050508" stopOpacity="0"  />
          </linearGradient>

          {/* Layered outer glow */}
          <filter id="rb-glow" x="-30%" y="-3%" width="160%" height="106%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="22" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="7"  result="blur2" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Tight spine glow */}
          <filter id="rb-glow-sharp" x="-18%" y="-3%" width="136%" height="106%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/*
          All paths start at x=1440 (right screen edge) and spiral inward.
          Each curve makes tight S-turns — first sweeping left into the hero,
          then winding down with undulating S-curves as it descends the page.
          This creates the visual of a golden ribbon unspooling from the edge.
        */}

        {/* Ribbon 1 — broadest, warm amber glow */}
        <path
          ref={path1Ref}
          d="
            M 1440 300
            C 1280 360, 1120 440, 980 620
            C 840 800, 820 1020, 960 1220
            C 1100 1420, 1180 1600, 1060 1840
            C 940 2080, 680 2220, 540 2480
            C 400 2740, 400 2960, 580 3180
            C 760 3400, 980 3520, 900 3780
            C 820 4040, 560 4180, 420 4460
            C 280 4740, 360 4980, 640 5180
          "
          stroke="url(#rb-grad-1)"
          strokeWidth="46"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#rb-glow)"
        />

        {/* Ribbon 2 — mid-weight, enters slightly lower */}
        <path
          ref={path2Ref}
          d="
            M 1440 400
            C 1270 455, 1100 535, 960 710
            C 820 885, 800 1100, 940 1290
            C 1080 1480, 1160 1660, 1040 1890
            C 920 2120, 670 2255, 530 2515
            C 390 2775, 390 2995, 570 3210
            C 750 3425, 965 3545, 885 3805
            C 805 4065, 545 4205, 405 4485
            C 265 4765, 345 5005, 625 5205
          "
          stroke="url(#rb-grad-2)"
          strokeWidth="30"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#rb-glow)"
        />

        {/* Ribbon 3 — outer sweep, enters higher */}
        <path
          ref={path3Ref}
          d="
            M 1440 200
            C 1260 275, 1080 380, 920 580
            C 760 780, 760 1020, 920 1220
            C 1080 1420, 1180 1620, 1040 1870
            C 900 2120, 630 2250, 480 2530
            C 330 2810, 330 3040, 530 3260
            C 730 3480, 960 3600, 870 3870
            C 780 4140, 510 4280, 360 4560
            C 210 4840, 290 5080, 590 5280
          "
          stroke="url(#rb-grad-3)"
          strokeWidth="20"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#rb-glow)"
        />

        {/* Ribbon 4 — fine accent, bright inner shine */}
        <path
          ref={path4Ref}
          d="
            M 1440 340
            C 1275 400, 1110 480, 970 655
            C 830 830, 810 1050, 950 1245
            C 1090 1440, 1170 1620, 1050 1855
            C 930 2090, 675 2225, 535 2485
            C 395 2745, 395 2965, 575 3185
            C 755 3405, 970 3525, 892 3785
            C 814 4045, 554 4185, 414 4465
            C 274 4745, 354 4985, 634 5185
          "
          stroke="url(#rb-grad-4)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#rb-glow-sharp)"
        />

        {/* Ribbon 5 — luminous core highlight */}
        <path
          ref={path5Ref}
          d="
            M 1440 370
            C 1273 428, 1108 510, 964 686
            C 820 862, 805 1082, 946 1278
            C 1087 1474, 1166 1654, 1046 1888
            C 926 2122, 672 2258, 532 2518
            C 392 2778, 392 2998, 572 3218
            C 752 3438, 967 3558, 888 3818
            C 809 4078, 549 4218, 409 4498
            C 269 4778, 349 5018, 629 5218
          "
          stroke="url(#rb-grad-5)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#rb-glow-sharp)"
        />
      </svg>

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
      <section ref={problemRef} className={`lp-section lp-problem ${problemIn ? 'lp-in' : ''}`}>
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
