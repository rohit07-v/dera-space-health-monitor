import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Theme } from '../context/ThemeContext';

interface RotatingGlobeBackgroundProps {
  theme: Theme;
}

export const RotatingGlobeBackground: React.FC<RotatingGlobeBackgroundProps> = ({ theme }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // SCENE, CAMERA, RENDERER
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 3.4);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // ROOT GLOBE PIVOT (Tilted at real Earth axial tilt 23.44°)
    const globePivot = new THREE.Group();
    globePivot.rotation.z = (23.44 * Math.PI) / 180;
    scene.add(globePivot);

    // ---------------------------------------------------------------
    // 1. PROCEDURAL DETAILED EARTH TEXTURE GENERATION
    // ---------------------------------------------------------------
    const createEarthTexture = (isLight: boolean): THREE.CanvasTexture => {
      const width = 2048;
      const height = 1024;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return new THREE.CanvasTexture(canvas);

      // 1. Ocean Background
      if (isLight) {
        const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
        oceanGrad.addColorStop(0, '#0284c7');
        oceanGrad.addColorStop(0.5, '#0ea5e9');
        oceanGrad.addColorStop(1, '#0369a1');
        ctx.fillStyle = oceanGrad;
      } else {
        const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
        oceanGrad.addColorStop(0, '#020713');
        oceanGrad.addColorStop(0.5, '#040d21');
        oceanGrad.addColorStop(1, '#020614');
        ctx.fillStyle = oceanGrad;
      }
      ctx.fillRect(0, 0, width, height);

      // Helper to project lon/lat to canvas coordinates
      const project = (lon: number, lat: number) => {
        const x = ((lon + 180) / 360) * width;
        const y = ((90 - lat) / 180) * height;
        return [x, y];
      };

      // 2. Latitude and Longitude Graticule Grid
      ctx.lineWidth = 1;
      ctx.strokeStyle = isLight ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 229, 255, 0.12)';
      for (let lat = -80; lat <= 80; lat += 20) {
        const [, y] = project(0, lat);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      for (let lon = -180; lon <= 180; lon += 30) {
        const [x] = project(lon, 0);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Equator highlight
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = isLight ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 229, 255, 0.3)';
      const [, eqY] = project(0, 0);
      ctx.beginPath();
      ctx.moveTo(0, eqY);
      ctx.lineTo(width, eqY);
      ctx.stroke();

      // 3. Vector Continents & Major Islands Polygons
      const continents: [number, number][][] = [
        // North America
        [
          [-168, 65], [-160, 71], [-130, 70], [-120, 76], [-80, 73], [-70, 62],
          [-55, 50], [-65, 44], [-75, 35], [-80, 25], [-97, 26], [-90, 21],
          [-80, 9], [-85, 12], [-105, 20], [-115, 30], [-124, 48], [-140, 60],
          [-168, 65]
        ],
        // Greenland
        [
          [-50, 60], [-40, 65], [-20, 75], [-20, 83], [-55, 83], [-70, 76],
          [-50, 60]
        ],
        // South America
        [
          [-78, 9], [-60, 10], [-50, 0], [-35, -5], [-38, -18], [-48, -28],
          [-58, -35], [-65, -55], [-75, -50], [-72, -35], [-81, -5], [-78, 9]
        ],
        // Europe
        [
          [-10, 36], [0, 43], [10, 45], [15, 55], [25, 71], [30, 70],
          [40, 65], [50, 55], [40, 45], [25, 36], [15, 38], [-5, 36], [-10, 36]
        ],
        // Africa
        [
          [-17, 32], [10, 37], [32, 31], [51, 12], [42, -5], [35, -25],
          [20, -35], [18, -34], [12, -18], [9, 4], [-15, 12], [-17, 32]
        ],
        // Asia
        [
          [35, 36], [50, 40], [60, 60], [70, 73], [105, 77], [170, 66],
          [140, 50], [130, 35], [120, 22], [105, 10], [100, 2], [90, 22],
          [80, 13], [70, 22], [60, 25], [50, 30], [35, 36]
        ],
        // India
        [
          [72, 22], [88, 22], [80, 8], [77, 8], [72, 22]
        ],
        // Japan
        [
          [130, 31], [140, 36], [145, 45], [140, 43], [132, 34], [130, 31]
        ],
        // Australia
        [
          [114, -22], [125, -15], [135, -12], [142, -11], [153, -28],
          [150, -38], [138, -35], [115, -34], [114, -22]
        ],
        // Antarctica
        [
          [-180, -70], [-120, -75], [-60, -65], [0, -70], [60, -65],
          [120, -70], [180, -70], [180, -90], [-180, -90], [-180, -70]
        ]
      ];

      // Draw Continents
      continents.forEach((poly) => {
        ctx.beginPath();
        poly.forEach(([lon, lat], i) => {
          const [x, y] = project(lon, lat);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();

        if (isLight) {
          ctx.fillStyle = '#15803d';
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#22c55e';
          ctx.stroke();
        } else {
          ctx.fillStyle = '#081c38';
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#00E5FF';
          ctx.stroke();
        }
      });

      // 4. Night City Lights Clusters (Dark Mode) / Daylight Settlements (Light Mode)
      const cities: [number, number, string][] = [
        [-95.1, 29.5, 'Houston MCC-H'],
        [-80.6, 28.5, 'Kennedy Space Center'],
        [-116.9, 35.4, 'Goldstone DSN'],
        [-74.0, 40.7, 'New York'],
        [-118.2, 34.0, 'Los Angeles'],
        [-4.2, 40.4, 'Madrid DSN'],
        [0.1, 51.5, 'London'],
        [2.3, 48.8, 'Paris'],
        [63.3, 45.9, 'Baikonur Cosmodrome'],
        [140.1, 36.1, 'Tsukuba JAXA'],
        [148.9, -35.4, 'Canberra DSN'],
        [116.4, 39.9, 'Beijing'],
        [77.2, 28.6, 'New Delhi'],
        [-43.2, -22.9, 'Rio de Janeiro'],
        [-52.8, 5.2, 'Kourou CSG'],
      ];

      cities.forEach(([lon, lat, name]) => {
        const [x, y] = project(lon, lat);
        ctx.beginPath();
        ctx.arc(x, y, isLight ? 4 : 3, 0, Math.PI * 2);
        ctx.fillStyle = isLight ? '#0369a1' : '#FFB547';
        ctx.fill();

        // Pulsing radar ring
        ctx.beginPath();
        ctx.arc(x, y, isLight ? 8 : 7, 0, Math.PI * 2);
        ctx.strokeStyle = isLight ? 'rgba(3, 105, 161, 0.4)' : 'rgba(0, 229, 255, 0.6)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Station text
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = isLight ? '#0f172a' : '#00E5FF';
        ctx.fillText(name, x + 10, y + 4);
      });

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      return texture;
    };

    // ---------------------------------------------------------------
    // 2. EARTH MESH & ATMOSPHERE
    // ---------------------------------------------------------------
    const isLightMode = theme === 'light';
    const earthGeometry = new THREE.SphereGeometry(1.25, 64, 64);
    const earthTexture = createEarthTexture(isLightMode);

    const earthMaterial = new THREE.MeshPhongMaterial({
      map: earthTexture,
      shininess: isLightMode ? 35 : 18,
      specular: isLightMode ? new THREE.Color(0x38bdf8) : new THREE.Color(0x00e5ff),
    });

    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    globePivot.add(earthMesh);

    // Atmospheric Glow Shell (Fresnel Limb Glow)
    const atmosphereGeometry = new THREE.SphereGeometry(1.285, 48, 48);
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
        uniform vec3 glowColor;
        void main() {
          float intensity = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.2);
          gl_FragColor = vec4(glowColor, intensity * 0.85);
        }
      `,
      uniforms: {
        glowColor: {
          value: isLightMode ? new THREE.Color(0x38bdf8) : new THREE.Color(0x00e5ff),
        },
      },
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });

    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    globePivot.add(atmosphereMesh);

    // ---------------------------------------------------------------
    // 3. 3D ORBITAL TRAJECTORY (ISS ORBIT)
    // ---------------------------------------------------------------
    const orbitGroup = new THREE.Group();
    // Inclined at 51.6° (real ISS orbit)
    orbitGroup.rotation.x = (51.6 * Math.PI) / 180;
    scene.add(orbitGroup);

    // Orbit Ring
    const orbitRadius = 1.62;
    const orbitCurve = new THREE.EllipseCurve(
      0, 0,
      orbitRadius, orbitRadius * 0.98,
      0, 2 * Math.PI,
      false,
      0
    );
    const orbitPoints = orbitCurve.getPoints(120).map((p) => new THREE.Vector3(p.x, 0, p.y));
    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const orbitMaterial = new THREE.LineBasicMaterial({
      color: isLightMode ? 0x0284c7 : 0x00e5ff,
      transparent: true,
      opacity: isLightMode ? 0.45 : 0.6,
      linewidth: 1.5,
    });
    const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
    orbitGroup.add(orbitLine);

    // ISS Satellite Marker
    const satGeometry = new THREE.BoxGeometry(0.045, 0.02, 0.09);
    const satMaterial = new THREE.MeshBasicMaterial({
      color: isLightMode ? 0x0284c7 : 0xffffff,
    });
    const satMesh = new THREE.Mesh(satGeometry, satMaterial);
    
    // Solar panels for ISS
    const panelGeom = new THREE.BoxGeometry(0.12, 0.005, 0.035);
    const panelMat = new THREE.MeshBasicMaterial({
      color: isLightMode ? 0x0ea5e9 : 0x00e5ff,
    });
    const leftPanel = new THREE.Mesh(panelGeom, panelMat);
    leftPanel.position.x = -0.07;
    const rightPanel = new THREE.Mesh(panelGeom, panelMat);
    rightPanel.position.x = 0.07;
    satMesh.add(leftPanel);
    satMesh.add(rightPanel);
    orbitGroup.add(satMesh);

    // ---------------------------------------------------------------
    // 4. CELESTIAL STARFIELD PARTICLES
    // ---------------------------------------------------------------
    const starsCount = 1200;
    const starPositions = new Float32Array(starsCount * 3);
    const starColors = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount; i++) {
      const radius = 6 + Math.random() * 18;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = radius * Math.cos(phi);

      if (isLightMode) {
        // Soft celestial particles for light mode
        starColors[i * 3] = 0.65;
        starColors[i * 3 + 1] = 0.75;
        starColors[i * 3 + 2] = 0.85;
      } else {
        // High-contrast cosmic stars
        const tint = Math.random();
        if (tint > 0.8) {
          starColors[i * 3] = 0.0;
          starColors[i * 3 + 1] = 0.9;
          starColors[i * 3 + 2] = 1.0; // Cyan
        } else if (tint > 0.6) {
          starColors[i * 3] = 1.0;
          starColors[i * 3 + 1] = 0.75;
          starColors[i * 3 + 2] = 0.3; // Amber
        } else {
          starColors[i * 3] = 0.95;
          starColors[i * 3 + 1] = 0.95;
          starColors[i * 3 + 2] = 1.0; // Pure white
        }
      }
    }

    const starsGeometry = new THREE.BufferGeometry();
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starsMaterial = new THREE.PointsMaterial({
      size: isLightMode ? 0.03 : 0.045,
      vertexColors: true,
      transparent: true,
      opacity: isLightMode ? 0.35 : 0.85,
    });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    // ---------------------------------------------------------------
    // 5. LIGHTING RIG
    // ---------------------------------------------------------------
    const ambientLight = new THREE.AmbientLight(
      isLightMode ? 0xffffff : 0x1a2e4a,
      isLightMode ? 1.4 : 0.9
    );
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(
      isLightMode ? 0xffffff : 0xd6f4ff,
      isLightMode ? 2.2 : 2.0
    );
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(
      isLightMode ? 0x38bdf8 : 0x00e5ff,
      isLightMode ? 0.8 : 1.2
    );
    rimLight.position.set(-5, -2, -3);
    scene.add(rimLight);

    // ---------------------------------------------------------------
    // 6. ANIMATION LOOP & SMOOTH INTERACTIVITY
    // ---------------------------------------------------------------
    let animationFrameId: number;
    let satAngle = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 0.4;
      targetMouseY = (e.clientY / window.innerHeight - 0.5) * 0.4;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth axial Earth rotation
      earthMesh.rotation.y += 0.0022;

      // Orbit satellite movement
      satAngle += 0.012;
      const satX = Math.cos(satAngle) * orbitRadius;
      const satZ = Math.sin(satAngle) * (orbitRadius * 0.98);
      satMesh.position.set(satX, 0, satZ);
      satMesh.rotation.y = -satAngle + Math.PI / 2;

      // Smooth mouse parallax lerp
      currentMouseX += (targetMouseX - currentMouseX) * 0.05;
      currentMouseY += (targetMouseY - currentMouseY) * 0.05;
      globePivot.rotation.y = currentMouseX;
      globePivot.rotation.x = currentMouseY;

      // Slow star field drift
      stars.rotation.y -= 0.0003;

      renderer.render(scene, camera);
    };

    animate();

    // CLEANUP
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      earthGeometry.dispose();
      earthMaterial.dispose();
      earthTexture.dispose();
      atmosphereGeometry.dispose();
      atmosphereMaterial.dispose();
      orbitGeometry.dispose();
      orbitMaterial.dispose();
      satGeometry.dispose();
      satMaterial.dispose();
      panelGeom.dispose();
      panelMat.dispose();
      starsGeometry.dispose();
      starsMaterial.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [theme]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden transition-opacity duration-1000"
      style={{
        opacity: theme === 'light' ? 0.9 : 0.95,
      }}
      aria-hidden="true"
    />
  );
};
