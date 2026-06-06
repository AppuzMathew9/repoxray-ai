import React, { useState, useEffect, useRef } from 'react';
import type { AnalysisReport } from './types';
import { DashboardOverview } from './components/DashboardOverview';
import { EngineeringReview } from './components/EngineeringReview';
import { DocumentationAudit } from './components/DocumentationAudit';
import { ResumeGenerator } from './components/ResumeGenerator';
import { InterviewPrep } from './components/InterviewPrep';
import { ImprovementRoadmap } from './components/ImprovementRoadmap';
import { RecruiterSnapshot } from './components/RecruiterSnapshot';
import {
  TrendingUp,
  Activity,
  BookOpen,
  Briefcase,
  Award,
  GitPullRequest,
  Sparkles,
  Terminal,
  Cpu,
  UserCheck,
  Search,
  X
} from 'lucide-react';

import { ThreeDBackground } from './components/ThreeDBackground';

type ViewType = 'overview' | 'engineering' | 'documentation' | 'resume' | 'interview' | 'roadmap' | 'recruiter';

interface GlobeRepoPoint {
  lat: number;
  lon: number;
  name: string;
  loc: string;
  url: string;
  owner: string;
  isOwner?: boolean;
}

const API_BASE = (import.meta.env.VITE_API_URL as string) || '';

function App() {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [activeTab, setActiveTab] = useState<ViewType>('overview');
  const [globeRepos, setGlobeRepos] = useState<GlobeRepoPoint[]>([]);
  const [isLightMode] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const matrixCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mouse coordinates state for 3D responsive parallax with spring physics
  const [spring, setSpring] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let reqId: number;
    const currentMouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const currentSpring = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    const handleMouseMove = (e: MouseEvent) => {
      currentMouse.x = e.clientX;
      currentMouse.y = e.clientY;
    };

    const updatePhysics = () => {
      // Smooth lerp for spring inertia follower
      currentSpring.x += (currentMouse.x - currentSpring.x) * 0.085;
      currentSpring.y += (currentMouse.y - currentSpring.y) * 0.085;
      setSpring({ x: currentSpring.x, y: currentSpring.y });

      reqId = requestAnimationFrame(updatePhysics);
    };

    window.addEventListener('mousemove', handleMouseMove);
    reqId = requestAnimationFrame(updatePhysics);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(reqId);
    };
  }, []);

  // Compute layered parallax values (bg moves, content moves slightly counter)
  const normX = (spring.x / (window.innerWidth || 1) - 0.5) * 2;
  const normY = (spring.y / (window.innerHeight || 1) - 0.5) * 2;

  const bgParallax = { x: normX * 18, y: normY * 18 };
  const cardParallax = { x: -normX * 8, y: -normY * 8 };

  const handleCardTilt = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    const dx = x - xc;
    const dy = y - yc;
    const rx = -(dy / yc) * 8;
    const ry = (dx / xc) * 8;
    
    // Localized tilt + counter-parallax displacement for intense depth feeling
    el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translate3d(${-normX * 6}px, ${-normY * 6}px, 10px) scale3d(1.015, 1.015, 1.015)`;
    el.style.boxShadow = '0 25px 50px -12px rgba(6, 182, 212, 0.18)';
    el.style.borderColor = 'rgba(6, 182, 212, 0.35)';
  };

  const resetCardTilt = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.style.transform = `perspective(800px) rotateX(0deg) rotateY(0deg) translate3d(${-normX * 8}px, ${-normY * 8}px, 0px) scale3d(1, 1, 1)`;
    el.style.boxShadow = '';
    el.style.borderColor = '';
  };

  // Initial planetary loading screen timer aligned with CSS animation keyframes
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 8300); // Completely unmount the loader after 8.3 seconds (2 full cycles + transition fade out)
    return () => clearTimeout(timer);
  }, []);

  // Matrix falling binary green codes background effect
  useEffect(() => {
    if (!loading) return;

    // Brief delay to ensure DOM is updated and canvas is mounted
    const timer = setTimeout(() => {
      const canvas = matrixCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let animationFrameId: number;
      let width = (canvas.width = window.innerWidth);
      let height = (canvas.height = window.innerHeight);

      const fontSize = 14;
      const columns = Math.floor(width / fontSize);
      const yPositions = Array(columns).fill(0).map(() => Math.random() * -500);

      const handleResize = () => {
        if (!canvas) return;
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      };
      window.addEventListener('resize', handleResize);

      const draw = () => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'; // black fade trails for matrix effect
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#10b981'; // Green matrix data rain
        ctx.font = `${fontSize}px monospace`;

        for (let i = 0; i < yPositions.length; i++) {
          const text = Math.random() > 0.5 ? '1' : '0';
          const x = i * fontSize;
          const y = yPositions[i];

          ctx.fillText(text, x, y);

          if (y > height && Math.random() > 0.98) {
            yPositions[i] = 0;
          } else {
            yPositions[i] += fontSize;
          }
        }
        animationFrameId = requestAnimationFrame(draw);
      };

      draw();

      return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationFrameId);
      };
    }, 50);

    return () => clearTimeout(timer);
  }, [loading]);

  // Jarvis booting loading simulation
  const triggerJarvisScan = async (url: string) => {
    setLoading(true);
    setProgress(0);
    setError(null);
    setLogMessages([]);

    const binaryLogs = [
      "SYSTEM INIT: ESTABLISHING GITHUB GATEWAY SECURE SHIELD...",
      "01000101 01010011 01010100 01000001 01000010 01001100 01001001 01010011 01001000",
      "ESTABLISHING SSH SECURE SHELL ON GITHUB REPO SHARDS...",
      "PARSING REMOTE FILE INDEX AND GENERATING TREE LIST...",
      "01010100 01001111 01001011 01000101 01001110 01001001 01011010 01000101 01010010",
      "SCANNING README SCHEMAS AND DETECTING INSTALLATION SCRIPTS...",
      "SCANNING SECURITY PROFILES AND API SECURE KEYS STRUCTURE...",
      "TOKENIZING SOURCE FILES FOR COGNITIVE NEURAL PROCESSING...",
      "01000011 01001111 01000111 01001110 01001001 01010100 01001001 01010110 01000101",
      "INITIATING AI COGNITIVE BRAIN INGEST VIA GEMINI-2.5-FLASH...",
      "GENERATING ATS Bullet descriptors utilizing action verbs...",
      "CONSTRUCTING 30-DAY QUALITY UPGRADE ROADMAP...",
      "PREPARING INTERVIEW SCENARIOS PREP SUITES...",
      "COMPILING DUAL STACK METRICS HEALTH INDEX...",
      "100% SECURE BOOT COMPLETE. DECRYPTING AUDIT PAYLOAD..."
    ];

    // Increment progress counter with randomized speed, capping at 95%
    let currentProgress = 0;
    const interval = setInterval(() => {
      if (currentProgress < 90) {
        currentProgress += Math.floor(Math.random() * 8) + 3;
      } else if (currentProgress < 95) {
        currentProgress += 1;
      } else {
        currentProgress = 95;
      }
      setProgress(currentProgress);

      // Selectively push binary messages as progress grows (exclude final 100% success log)
      const logCount = Math.min(
        binaryLogs.length - 1,
        Math.floor((currentProgress / 100) * binaryLogs.length) + 1
      );
      setLogMessages(binaryLogs.slice(0, logCount));
    }, 120);

    // Call real API
    try {
      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze repository');
      }

      // Complete progress to 100% immediately on success
      clearInterval(interval);
      setProgress(100);
      setLogMessages(binaryLogs); // push final success log message

      // Wait a brief delay for visual satisfaction before presenting report
      setTimeout(() => {
        setReport(data);
        setActiveTab('overview');
        setLoading(false);
      }, 1000);

    } catch (err: unknown) {
      clearInterval(interval);
      const errMsg = err instanceof Error ? err.message : 'Failed to run analysis.';
      setError(errMsg);
      setLoading(false);
    }
  };

  // Fetch real repositories from backend to show as points on the globe
  useEffect(() => {
    if (report) return;
    fetch(`${API_BASE}/api/globe-repos`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Shuffle and slice to showcase 500 random repo points
          const shuffled = [...data].sort(() => 0.5 - Math.random());
          setGlobeRepos(shuffled.slice(0, 500));
        }
      })
      .catch(err => console.error("Failed to load globe repos:", err));
  }, [report]);

  // 3D amCharts Globe Render Logic
  useEffect(() => {
    if (report || loading) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const am5 = (window as any).am5;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const am5map = (window as any).am5map;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const am5themes_Animated = (window as any).am5themes_Animated;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const am5geodata_worldLow = (window as any).am5geodata_worldLow;

    if (!am5 || !am5map || !am5themes_Animated || !am5geodata_worldLow) {
      console.error("amCharts 5 libraries are not loaded on window.");
      return;
    }

    // Dispose any existing root on chartdiv to prevent "Root element already exists" crash in React StrictMode
    if (am5.registry && Array.isArray(am5.registry.rootElements)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      am5.registry.rootElements.forEach((r: any) => {
        if (r && r.dom && r.dom.id === "chartdiv") {
          r.dispose();
        }
      });
    }

    // Create root element
    const root = am5.Root.new("chartdiv");

    // Set themes
    root.setThemes([
      am5themes_Animated.new(root)
    ]);

    // Create the map chart
    const chart = root.container.children.push(am5map.MapChart.new(root, {
      panX: "none",
      panY: "none",
      wheelX: "none",
      wheelY: "none",
      pinchZoom: false,
      maxZoomLevel: 1,
      projection: am5map.geoOrthographic(),
      paddingBottom: 20,
      paddingTop: 20,
      paddingLeft: 20,
      paddingRight: 20
    }));

    // Create series for background fill (ocean)
    const backgroundSeries = chart.series.push(am5map.MapPolygonSeries.new(root, {}));
    backgroundSeries.mapPolygons.template.setAll({
      fill: isLightMode ? am5.color(0xf1f5f9) : am5.color(0x020617), // solid light slate ocean / dark blue ocean
      fillOpacity: isLightMode ? 1.0 : 0.8,
      strokeOpacity: 0
    });
    backgroundSeries.data.push({
      geometry: am5map.getGeoRectangle(90, 180, -90, -180)
    });

    // Create main polygon series for countries
    const polygonSeries = chart.series.push(am5map.MapPolygonSeries.new(root, {
      geoJSON: am5geodata_worldLow
    }));

    polygonSeries.mapPolygons.template.setAll({
      tooltipText: "{name}",
      toggleKey: "active",
      interactive: true,
      fill: isLightMode ? am5.color(0xe2e8f0) : am5.color(0x1e293b), // light slate / dark slate fill
      stroke: isLightMode ? am5.color(0xcbd5e1) : am5.color(0x334155), // light border / dark border
      strokeWidth: 0.5
    });

    polygonSeries.mapPolygons.template.states.create("hover", {
      fill: isLightMode ? am5.color(0x0ea5e9) : am5.color(0x06b6d4), // Deep blue / Cyan hover
      fillOpacity: isLightMode ? 0.5 : 0.3
    });

    // Create graticule series (grid lines)
    const graticuleSeries = chart.series.push(am5map.GraticuleSeries.new(root, {}));
    graticuleSeries.mapLines.template.setAll({
      strokeOpacity: isLightMode ? 0.15 : 0.08,
      stroke: isLightMode ? am5.color(0x94a3b8) : am5.color(0x64748b)
    });

    // Create Point Series for repository markers
    const pointSeries = chart.series.push(am5map.MapPointSeries.new(root, {
      latitudeField: "lat",
      longitudeField: "lon"
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pointSeries.bullets.push((root: any, _series: any, dataItem: any) => {
      const repo = dataItem.dataContext || {};
      const isOwner = !!(repo.isOwner || (repo.loc && typeof repo.loc === 'string' && repo.loc.includes("Owner Repository")));
      const colorHex = isOwner ? 0xdb2777 : 0x0891b2;
      const ringColor = isOwner ? 0xec4899 : 0x06b6d4;

      // Base bullet container with a large invisible background for stable hit targeting
      const container = am5.Container.new(root, {
        interactive: true,
        tooltipText: "[bold]{name}[/]\n{loc}",
        cursorOverStyle: "pointer",
        width: 30,
        height: 30,
        centerX: am5.p50,
        centerY: am5.p50,
        background: am5.Rectangle.new(root, {
          fill: am5.color(0xffffff),
          fillOpacity: 0,
          strokeOpacity: 0
        })
      });

      // Set hover state scaling
      container.states.create("hover", {
        scale: 1.3
      });

      // Soft pulsing outer ring
      const circleOutline = container.children.push(am5.Circle.new(root, {
        radius: 8,
        fill: am5.color(ringColor),
        fillOpacity: 0.35,
        strokeOpacity: 0,
        x: am5.p50,
        y: am5.p50,
        centerX: am5.p50,
        centerY: am5.p50
      }));

      // Pulsing animations
      circleOutline.animate({
        key: "scale",
        from: 1,
        to: 2.0,
        duration: isOwner ? 800 : 1600,
        loops: Infinity
      });

      circleOutline.animate({
        key: "opacity",
        from: 0.8,
        to: 0,
        duration: isOwner ? 800 : 1600,
        loops: Infinity
      });

      // Solid central core dot
      container.children.push(am5.Circle.new(root, {
        radius: 4.5,
        fill: am5.color(colorHex),
        stroke: am5.color(0xffffff),
        strokeWidth: 1,
        x: am5.p50,
        y: am5.p50,
        centerX: am5.p50,
        centerY: am5.p50
      }));

      // When the marker is clicked, trigger scanner
      container.events.on("click", () => {
        if (repo && repo.url) {
          setRepoUrl(repo.url);
          triggerJarvisScan(repo.url);
        }
      });

      return am5.Bullet.new(root, {
        sprite: container
      });
    });

    // Map each repo to point series data
    const mapData = globeRepos.map((repo) => {
      return {
        lat: repo.lat,
        lon: repo.lon,
        name: repo.name,
        loc: repo.loc,
        url: repo.url,
        owner: repo.owner,
        isOwner: repo.isOwner
      };
    });
    pointSeries.data.setAll(mapData);

    // Rotate animation
    const animation = chart.animate({
      key: "rotationX",
      from: 0,
      to: 360,
      duration: 35000,
      loops: Infinity
    });

    // Pause rotation on manual dragging/panning and resume on idle
    let rotationTimeout: ReturnType<typeof setTimeout> | undefined;
    chart.events.on("panstarted", () => {
      animation.pause();
      if (rotationTimeout) clearTimeout(rotationTimeout);
    });

    chart.events.on("panended", () => {
      if (rotationTimeout) clearTimeout(rotationTimeout);
      rotationTimeout = setTimeout(() => {
        animation.play();
      }, 4000);
    });

    return () => {
      if (animation) animation.stop();
      root.dispose();
    };
  }, [report, loading, globeRepos, isLightMode]);

  // Jarvis booting loading simulation is now declared above


  const handleManualAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;
    triggerJarvisScan(repoUrl);
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans selection:bg-cyan-500/30 transition-colors duration-300 ${isLightMode ? 'bg-[#f8fafc] text-slate-800 selection:text-cyan-800' : 'bg-[#030712] text-slate-100 selection:text-cyan-200'} overflow-x-hidden relative`}>

      {/* 1. FUTURISTIC JARVIS BOOTING SCANNER SCREEN */}
      {loading && (
        <div className="fixed inset-0 bg-[#02050c] z-[9999] flex flex-col justify-between p-8 sm:p-12 font-mono overflow-hidden">
          {/* Matrix Rain Background CSS columns */}
          <div className="matrix-container absolute inset-0 w-full h-full opacity-45 pointer-events-none z-0 overflow-hidden">
            <div className="matrix-pattern">
              {Array.from({ length: 40 }).map((_, i) => (
                <div key={i} className="matrix-column" />
              ))}
            </div>
          </div>

          {/* Ambient dark cyan glowing vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.05)_0%,transparent_70%)] pointer-events-none z-1"></div>

          {/* Header telemetry info */}
          <div className="relative z-10 flex justify-between items-start text-[10px] text-cyan-500/60 uppercase tracking-widest">
            <div>
              <div>CORE: RUN_MATRIX_V25</div>
              <div>SECURE ENVELOPE: ACTIVE</div>
            </div>
            <div className="text-right">
              <div>INGEST GATEWAY: OPEN</div>
              <div>FRAME RATE: 60 FPS</div>
            </div>
          </div>

          {/* Center Loading Ring (Cyan Jarvis theme) */}
          <div className="relative z-10 flex flex-col items-center justify-center py-12">
            {/* Spinning outer HUD rings */}
            <div className="w-60 h-60 border-2 border-dashed border-cyan-500/20 rounded-full animate-[spin_10s_linear_infinite] absolute"></div>
            <div className="w-52 h-52 border border-dotted border-purple-500/30 rounded-full animate-[spin_6s_linear_infinite_reverse] absolute"></div>
            <div className="w-44 h-44 border border-cyan-500/40 rounded-full animate-pulse absolute"></div>

            {/* Inner Percentage Counter */}
            <div className="relative flex flex-col items-center justify-center">
              <span className="text-5xl font-extrabold tracking-wider text-white font-outfit drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                {progress}%
              </span>
              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mt-2 animate-pulse flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" /> AUDITING TARGET
              </span>
            </div>
          </div>

          {/* Faded bottom telemetry overlay logs */}
          <div className="relative z-10 max-w-xl mx-auto w-full flex flex-col items-center justify-center text-center space-y-2 pb-6">
            {/* Current active log */}
            <div className="text-xs text-cyan-400 font-bold tracking-wider uppercase animate-pulse flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 animate-spin" />
              <span>{logMessages[logMessages.length - 1] || "INITIALIZING ANALYSIS CORE..."}</span>
            </div>
            {/* Faded recent background tasks */}
            <div className="text-[9px] text-slate-500 space-y-1">
              {logMessages.slice(-3, -1).map((msg, idx) => (
                <div key={idx} className="opacity-40">{msg}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isInitializing && (
        <div className="initial-loader-overlay fixed inset-0 bg-[#000000] z-[100] flex flex-col items-center justify-center overflow-hidden">
          <div className="planets scale-120">
            <div id="planetTrail1" />
            <div id="planetTrail2" />
            <div id="planetTrail3" />
            <div id="starShadow" />
            <div id="star" />
            <div id="blackHole" />
            <div id="blackHoleDisk1" />
            <div id="blackHoleDisk2" />
            <div id="planet" />
          </div>
          <div className="mt-16 text-[9px] font-mono tracking-[0.3em] text-orange-500/60 uppercase animate-pulse">
            Aligning Planetary Coordinates...
          </div>
        </div>
      )}

      {/* Background blurs */}
      <div className={`absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full blur-[160px] pointer-events-none transition-all duration-300 ${isLightMode ? 'bg-cyan-200/10' : 'bg-cyan-950/20'}`}></div>
      <div className={`absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full blur-[160px] pointer-events-none transition-all duration-300 ${isLightMode ? 'bg-purple-200/10' : 'bg-purple-950/20'}`}></div>

      {/* Navbar */}
      <header className={`border-b sticky top-0 z-40 backdrop-blur-xl transition-colors duration-300 ${isLightMode ? 'border-slate-200/80 bg-white/80' : 'border-white/5 bg-[#030712]/70'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="logo-btn" data-alt="REPOXRAY AI" onClick={() => setReport(null)}>
            <div className="logo-btn-icon">
              <svg className="w-5.5 h-5.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <rect x="2" y="2" width="20" height="20" rx="4" stroke="currentColor" strokeWidth={1.5} />
                <path d="M8 17v-6m3 6v-8m3 8v-7m3 7v-5M6 17c1-2 4-3 6-3s5 1 6 3" stroke="#00e5cc" strokeWidth={2} strokeLinecap="round" />
                <line x1="3" y1="10" x2="21" y2="10" stroke="#cffafe" strokeWidth={1.5} className="animate-pulse" />
              </svg>
            </div>
            <div className="logo-btn-text" data-alt="REPOXRAY AI">
              <i>R</i><i>E</i><i>P</i><i>O</i><i>X</i><i>R</i><i>A</i><i>Y</i>
              <i style={{ marginLeft: '6px', color: '#a5f3fc' }}>A</i>
              <i style={{ color: '#a5f3fc' }}>I</i>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container with 3D Parallax translation */}
      <main 
        className="flex-grow w-full py-0 flex items-center transition-all duration-300 ease-out"
        style={{
          transform: `translate3d(${cardParallax.x}px, ${cardParallax.y}px, 0px)`,
        }}
      >

        {!report ? (

          <div className="relative w-full min-h-[calc(100vh-120px)] grid grid-cols-1 lg:grid-cols-12 overflow-hidden px-4 sm:px-6 lg:px-8">

            {/* Control Panel Column */}
            <div className="lg:col-span-5 flex items-center justify-center z-25 py-8 lg:py-0">
              <div 
                onMouseMove={handleCardTilt}
                onMouseLeave={resetCardTilt}
                className={`w-full max-w-md p-8 rounded-3xl transition-all duration-300 shadow-2xl flex flex-col space-y-6 pointer-events-auto border ${isLightMode
                    ? 'border-slate-200 bg-white/95 text-slate-800 shadow-slate-200/50'
                    : 'bg-slate-950/80 backdrop-blur-xl border-white/10 text-slate-100'
                  }`}
                style={{
                  transformStyle: 'preserve-3d',
                  backfaceVisibility: 'hidden',
                  transition: 'transform 0.1s ease-out, box-shadow 0.3s ease, border-color 0.3s ease',
                }}
              >

                {/* Ingest Heading introduction */}
                <div className="space-y-4">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest font-outfit border transition-colors duration-300 ${isLightMode
                      ? 'bg-cyan-50 border-cyan-200/60 text-cyan-600'
                      : 'bg-white/10 border-white/5 text-cyan-400'
                    }`}>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Next-Gen Repository Auditor</span>
                  </div>

                  <h2 className={`text-2xl font-extrabold tracking-tight font-outfit transition-colors duration-300 ${isLightMode ? 'text-slate-900' : 'text-white'
                    }`}>
                    Audit GitHub Repositories
                  </h2>

                  <p className={`text-xs font-sans leading-relaxed transition-colors duration-300 ${isLightMode ? 'text-slate-600' : 'text-slate-350'
                    }`}>
                    Explore and click any of the 500 active coordinate points on the interactive globe to audit them, or enter a link below.
                  </p>
                </div>

                {/* Manual Scan Input Box with Dynamic Autocomplete Search */}
                <div className="relative w-full">
                  <form onSubmit={handleManualAnalyze} className="messageBox">
                    <div className="fileUploadWrapper">
                      <label>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400 w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582" />
                        </svg>
                        <span className="tooltip">GitHub Repository Scan</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      id="messageInput"
                      placeholder="Enter GitHub URL or type to search 500+ globe repos..."
                      value={repoUrl}
                      onChange={(e) => {
                        setRepoUrl(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      onBlur={() => setTimeout(() => setShowDropdown(false), 250)}
                      required
                    />
                    <button type="submit" id="sendButton" aria-label="Submit Audit">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-cyan-400 w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </button>
                  </form>

                  {showDropdown && repoUrl.trim() && (() => {
                    const filtered = globeRepos.filter(repo =>
                      repo.name.toLowerCase().includes(repoUrl.toLowerCase()) ||
                      (repo.owner && repo.owner.toLowerCase().includes(repoUrl.toLowerCase()))
                    ).slice(0, 5);

                    if (filtered.length === 0) return null;

                    return (
                      <div className="absolute left-0 right-0 mt-2 bg-slate-950/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 divide-y divide-white/5 max-h-60 overflow-y-auto">
                        {filtered.map((repo, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setRepoUrl(repo.url);
                              setShowDropdown(false);
                              triggerJarvisScan(repo.url);
                            }}
                            className="flex justify-between items-center px-4 py-3 hover:bg-slate-900/60 cursor-pointer text-left transition-colors"
                          >
                            <div>
                              <div className="text-xs font-bold text-white">{repo.name}</div>
                              <div className="text-[10px] text-slate-500">@{repo.owner || 'github'} • {repo.loc}</div>
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${repo.isOwner
                                ? 'text-pink-400 bg-pink-500/10 border-pink-900/30'
                                : 'text-cyan-400 bg-cyan-500/10 border-cyan-900/30'
                              }`}>
                              {repo.isOwner ? 'Owner' : 'Public'}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {error && (
                  <div className="p-3 bg-rose-950/20 border border-rose-900/30 rounded-xl text-rose-400 text-xs text-center font-semibold">
                    {error}
                  </div>
                )}

                {/* Legend guide */}
                <div className={`flex items-center justify-center gap-4 pt-4 border-t text-[9px] font-bold tracking-widest uppercase transition-colors duration-300 ${isLightMode ? 'border-slate-100 text-slate-500' : 'border-white/5 text-slate-400'
                  }`}>
                  <span className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 border transition-all duration-300 ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'
                    }`}>
                    <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                    <span>Public Repos</span>
                  </span>
                  <span className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 border transition-all duration-300 ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'
                    }`}>
                    <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping"></span>
                    <span>Owner Shards</span>
                  </span>
                </div>

              </div>
            </div>

            {/* Interactive Globe Column with Background Parallax */}
            <div 
              className="lg:col-span-7 relative min-h-[450px] lg:min-h-[600px] w-full flex items-center justify-center z-10 pointer-events-auto transition-transform duration-300 ease-out"
              style={{
                transform: `translate3d(${bgParallax.x}px, ${bgParallax.y}px, 0px)`,
              }}
            >
              <ThreeDBackground />
              <div
                id="chartdiv"
                className="w-full h-full"
                style={{ minHeight: "500px" }}
              />
            </div>

          </div>
        ) : (

          // 3. DASHBOARD COMPONENTS PANEL (DASHCOM TEMPLATE STYLE)
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-[#090d16] border border-white/5 overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-12 min-h-[650px]">

              {/* Sidebar Navigation */}
              <aside className="lg:col-span-3 bg-[#111625] border-r border-white/5 p-6 flex flex-col justify-between">
                <div className="space-y-8">
                  <div className="flex items-center gap-2 px-2">
                    <div className="w-6.5 h-6.5 rounded-lg bg-cyan-950 flex items-center justify-center border border-cyan-800/30 text-cyan-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <rect x="2" y="6" width="20" height="12" rx="2" strokeWidth={2} />
                      </svg>
                    </div>
                    <span className="text-sm font-bold text-white tracking-widest font-outfit uppercase">RepoXray</span>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      {[
                        { id: 'overview', name: 'Dashboard Overview', icon: TrendingUp },
                        { id: 'engineering', name: 'Engineering Review', icon: Activity },
                        { id: 'documentation', name: 'Documentation Audit', icon: BookOpen },
                        { id: 'resume', name: 'Resume Generator', icon: Briefcase },
                        { id: 'recruiter', name: 'Recruiter Snapshot', icon: UserCheck },
                      ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as ViewType)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-[11px] font-bold rounded-xl transition-all cursor-pointer ${isActive
                                ? 'bg-gradient-to-r from-indigo-650 to-indigo-600 text-white shadow-md shadow-indigo-900/30'
                                : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                              }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{tab.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="space-y-1.5">
                      <div className="px-4 text-[9px] font-bold uppercase text-slate-500 tracking-wider">Analysis Options</div>
                      {[
                        { id: 'interview', name: 'Interview Prep Guidelines', icon: Award },
                        { id: 'roadmap', name: '30-Day Project Roadmap', icon: GitPullRequest },
                      ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as ViewType)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-[11px] font-bold rounded-xl transition-all cursor-pointer ${isActive
                                ? 'bg-gradient-to-r from-indigo-650 to-indigo-600 text-white shadow-md shadow-indigo-900/30'
                                : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                              }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{tab.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5">
                  <button
                    onClick={() => setReport(null)}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 text-[10px] font-bold rounded-xl transition-colors w-full cursor-pointer uppercase tracking-wider"
                  >
                    Scan New Repo
                  </button>
                </div>
              </aside>

              {/* Right Content Area */}
              <div className="lg:col-span-9 p-6 sm:p-8 space-y-6">

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/5">
                  <div>
                    <h2 className="text-lg font-bold text-white font-outfit">
                      {activeTab === 'overview' && 'Public Profile Audit'}
                      {activeTab === 'engineering' && 'Engineering Quality Assessment'}
                      {activeTab === 'documentation' && 'Documentation Completion Check'}
                      {activeTab === 'resume' && 'ATS Resume Bullets'}
                      {activeTab === 'interview' && 'Scenario Interview Prep'}
                      {activeTab === 'roadmap' && '30-Day Improvement Timeline'}
                      {activeTab === 'recruiter' && 'Hiring snapshot Summary'}
                    </h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                      Updated at {new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex items-center bg-[#111625] border border-white/5 rounded-xl px-3 py-1.5 w-full sm:w-56 gap-2 focus-within:border-cyan-500/30 transition-colors">
                      <Search className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      <input
                        type="text"
                        placeholder="Search stats..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-0 p-0 text-[10px] placeholder-slate-500 text-white focus:outline-none w-full"
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="flex-shrink-0 text-slate-500 hover:text-white transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="p-2 bg-[#111625] border border-white/5 rounded-xl text-slate-400 text-xs flex items-center justify-center">
                      <span className="text-[9px] font-bold">All time</span>
                    </div>
                  </div>
                </div>

                {/* Dashboard Inner Views */}
                <div className="min-h-[500px]">
                  {activeTab === 'overview' && <DashboardOverview data={report} searchQuery={searchQuery} />}
                  {activeTab === 'engineering' && <EngineeringReview data={report} searchQuery={searchQuery} />}
                  {activeTab === 'documentation' && <DocumentationAudit data={report} searchQuery={searchQuery} />}
                  {activeTab === 'resume' && <ResumeGenerator data={report} searchQuery={searchQuery} />}
                  {activeTab === 'interview' && <InterviewPrep data={report} searchQuery={searchQuery} />}
                  {activeTab === 'roadmap' && <ImprovementRoadmap data={report} searchQuery={searchQuery} />}
                  {activeTab === 'recruiter' && <RecruiterSnapshot data={report} searchQuery={searchQuery} />}
                </div>

              </div>

            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center bg-[#030712] mt-auto">
        <p className="text-[10px] text-slate-500 tracking-wider font-bold uppercase">&copy; {new Date().getFullYear()} RepoXray AI. Designed for QuAnHack Platform.</p>
      </footer>
    </div>
  );
}

export default App;
