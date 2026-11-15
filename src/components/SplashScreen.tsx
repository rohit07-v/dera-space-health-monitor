import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const globeContainerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('INITIALIZING BIOTELEMETRY ENVELOPE...');
  const [isFadingOut, setIsFadingOut] = useState(false);

  // 3D Rotating Globe in Pure Black Space
  useEffect(() => {
    const container = globeContainerRef.current;
    if (!container) return;

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 320;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 3.2);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Pivot with Earth's axial tilt (23.44°)
    const globePivot = new THREE.Group();
    globePivot.rotation.z = (23.44 * Math.PI) / 180;
    scene.add(globePivot);

    // Procedural Earth Texture
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Deep ocean
      const oceanGrad = ctx.createLinearGradient(0, 0, 0, 512);
      oceanGrad.addColorStop(0, '#020b1e');
      oceanGrad.addColorStop(0.5, '#06173a');
      oceanGrad.addColorStop(1, '#020819');
      ctx.fillStyle = oceanGrad;
      ctx.fillRect(0, 0, 1024, 512);

      // Lat/Lon Graticules
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.18)';
      for (let lat = -80; lat <= 80; lat += 20) {
        const y = ((90 - lat) / 180) * 512;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1024, y);
        ctx.stroke();
      }
      for (let lon = -180; lon <= 180; lon += 30) {
        const x = ((lon + 180) / 360) * 1024;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 512);
        ctx.stroke();
      }

      // Equator
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
      ctx.beginPath();
      ctx.moveTo(0, 256);
      ctx.lineTo(1024, 256);
      ctx.stroke();

      // Continent Silhouettes
      const project = (lon: number, lat: number) => [
        ((lon + 180) / 360) * 1024,
        ((90 - lat) / 180) * 512,
      ];

      const continents: [number, number][][] = [
        // North America
        [[-168, 65], [-160, 71], [-130, 70], [-120, 76], [-80, 73], [-70, 62], [-55, 50], [-65, 44], [-75, 35], [-80, 25], [-97, 26], [-90, 21], [-80, 9], [-85, 12], [-105, 20], [-115, 30], [-124, 48], [-140, 60], [-168, 65]],
        // South America
        [[-78, 9], [-60, 10], [-50, 0], [-35, -5], [-38, -18], [-48, -28], [-58, -35], [-65, -55], [-75, -50], [-72, -35], [-81, -5], [-78, 9]],
        // Europe
        [[-10, 36], [0, 43], [10, 45], [15, 55], [25, 71], [30, 70], [40, 65], [50, 55], [40, 45], [25, 36], [15, 38], [-5, 36], [-10, 36]],
        // Africa
        [[-17, 32], [10, 37], [32, 31], [51, 12], [42, -5], [35, -25], [20, -35], [18, -34], [12, -18], [9, 4], [-15, 12], [-17, 32]],
        // Asia
        [[35, 36], [50, 40], [60, 60], [70, 73], [105, 77], [170, 66], [140, 50], [130, 35], [120, 22], [105, 10], [100, 2], [90, 22], [80, 13], [70, 22], [60, 25], [50, 30], [35, 36]],
        // Australia
        [[114, -22], [125, -15], [135, -12], [142, -11], [153, -28], [150, -38], [138, -35], [115, -34], [114, -22]],
      ];

      continents.forEach((poly) => {
        ctx.beginPath();
        poly.forEach(([lon, lat], i) => {
          const [x, y] = project(lon, lat);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fillStyle = '#0b2447';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#00E5FF';
        ctx.stroke();
      });

      // NASA Key Stations (Houston, Kennedy, Goldstone)
      const stations: [number, number, string][] = [
        [-95.1, 29.5, 'Houston'],
        [-80.6, 28.5, 'KSC'],
        [-116.9, 35.4, 'DSN'],
      ];
      stations.forEach(([lon, lat, name]) => {
        const [x, y] = project(lon, lat);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#FF5368';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.strokeStyle = '#00E5FF';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(name, x + 8, y + 3);
      });
    }

    const earthTexture = new THREE.CanvasTexture(canvas);
    earthTexture.wrapS = THREE.RepeatWrapping;

    // Earth Sphere
    const earthGeometry = new THREE.SphereGeometry(1.15, 48, 48);
    const earthMaterial = new THREE.MeshPhongMaterial({
      map: earthTexture,
      shininess: 25,
      specular: new THREE.Color(0x00e5ff),
    });
    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    globePivot.add(earthMesh);

    // Glowing Atmospheric Shell
    const atmosphereGeometry = new THREE.SphereGeometry(1.185, 36, 36);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(0.0, 0.898, 1.0, intensity * 0.9);
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    globePivot.add(atmosphereMesh);

    // Orbital Ring
    const orbitRadius = 1.45;
    const orbitCurve = new THREE.EllipseCurve(0, 0, orbitRadius, orbitRadius * 0.96, 0, 2 * Math.PI, false, 0);
    const orbitPoints = orbitCurve.getPoints(90).map((p) => new THREE.Vector3(p.x, 0, p.y));
    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const orbitMaterial = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.6 });
    const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
    orbitLine.rotation.x = (51.6 * Math.PI) / 180;
    scene.add(orbitLine);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x1a2e4a, 1.2);
    scene.add(ambientLight);
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.4);
    sunLight.position.set(4, 3, 5);
    scene.add(sunLight);
    const rimLight = new THREE.DirectionalLight(0x00e5ff, 1.0);
    rimLight.position.set(-4, -2, -3);
    scene.add(rimLight);

    let reqId: number;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      earthMesh.rotation.y += 0.005;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(reqId);
      renderer.dispose();
      earthGeometry.dispose();
      earthMaterial.dispose();
      earthTexture.dispose();
      atmosphereGeometry.dispose();
      atmosphereMaterial.dispose();
      orbitGeometry.dispose();
      orbitMaterial.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Progression Simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        const next = prev + 5;
        if (next > 30 && next < 60) {
          setStatusText('CALIBRATING ISOLATION FOREST & XAI ATTRIBUTION...');
        } else if (next >= 60 && next < 90) {
          setStatusText('CONNECTING TO NASA DEEP SPACE NETWORK (DSN)...');
        } else if (next >= 90) {
          setStatusText('ALL SYSTEMS NOMINAL. ENTERING FLIGHT CONSOLE...');
        }
        return next;
      });
    }, 110);

    return () => clearInterval(timer);
  }, []);

  // Auto-finish when progress reaches 100%
  useEffect(() => {
    if (progress >= 100) {
      const finishTimeout = setTimeout(() => {
        handleDismiss();
      }, 400);
      return () => clearTimeout(finishTimeout);
    }
  }, [progress]);

  const handleDismiss = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      onComplete();
    }, 500);
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black text-white select-none transition-opacity duration-500 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ backgroundColor: '#000000' }}
    >
      {/* 3D ROTATING GLOBE CONTAINER */}
      <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
        {/* Ambient Glow Aura */}
        <div className="absolute inset-0 rounded-full bg-cyan-500/10 blur-2xl pointer-events-none" />
        <div ref={globeContainerRef} className="w-full h-full relative z-10" />
      </div>

      {/* NASA BRANDING TAG (DIRECTLY BELOW THE 3D ROTATING GLOBE) */}
      <div className="mt-4 flex flex-col items-center space-y-2.5 z-10">
        {/* ICONIC NASA TAG BADGE */}
        <div className="flex items-center gap-3 px-6 py-2 rounded-2xl bg-black border-2 border-red-600/90 shadow-[0_0_30px_rgba(239,68,68,0.35)]">
          {/* NASA Red Meatball Curve Accent */}
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          <span className="text-3xl sm:text-4xl font-black tracking-[0.28em] text-white font-mono uppercase drop-shadow-[0_2px_12px_rgba(255,255,255,0.4)]">
            NASA
          </span>
        </div>

        {/* SUBTITLE SPECIFICATIONS */}
        <div className="text-center space-y-1">
          <div className="text-[11px] sm:text-xs font-mono font-bold tracking-[0.25em] text-cyan-400 uppercase">
            National Aeronautics and Space Administration
          </div>
          <div className="text-[10px] sm:text-[11px] font-mono tracking-widest text-slate-400">
            DeRa · HUMAN RESEARCH PROGRAM (HRP)
          </div>
        </div>
      </div>

      {/* MISSION BOOTSTRAP PROGRESS BAR */}
      <div className="mt-8 w-64 sm:w-80 space-y-2 z-10 font-mono">
        <div className="flex justify-between items-center text-[10px] text-slate-400">
          <span className="truncate max-w-[210px] text-cyan-300 font-bold">{statusText}</span>
          <span className="text-white font-bold">{progress}%</span>
        </div>
        <div className="h-1.5 w-full bg-slate-900 border border-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-red-500 transition-all duration-150 rounded-full shadow-[0_0_10px_rgba(0,229,255,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* SKIP / ENTER CONSOLE BUTTON */}
      <button
        onClick={handleDismiss}
        className="mt-6 px-5 py-2 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-400/60 text-slate-400 hover:text-cyan-300 text-xs font-mono tracking-wider transition-all cursor-pointer z-10"
      >
        PRESS TO ENTER MISSION CONTROL &rarr;
      </button>

      {/* SUBTLE CORNER TELEMETRY READOUTS */}
      <div className="absolute top-4 left-4 text-[10px] font-mono text-slate-600 hidden sm:block">
        NASA SPACE APPS CHALLENGE 2026
        <br />
        EXPEDITION 72 · LUNAR GATEWAY
      </div>
      <div className="absolute top-4 right-4 text-[10px] font-mono text-slate-600 text-right hidden sm:block">
        AUTONOMOUS BIOSENSORS: 1Hz
        <br />
        KA-BAND DSN TELEMETRY LOCK
      </div>
    </div>
  );
};
