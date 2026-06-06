import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';

export const ThreeDBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create scene, camera, and renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x02050c, 0.015);

    const width = container.clientWidth;
    const height = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.z = 30;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Group to hold all 3D content for mouse parallax
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // Determine particle count based on screen width (Mobile Optimization)
    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? 600 : 1500;

    // Create Starfield Particles
    const starsGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(particleCount * 3);
    const starColors = new Float32Array(particleCount * 3);

    const color1 = new THREE.Color(0x06b6d4); // Cyan
    const color2 = new THREE.Color(0x8b5cf6); // Purple
    const color3 = new THREE.Color(0x00f5ff); // Bright Cyan/White

    for (let i = 0; i < particleCount; i++) {
      // Scatter in a spherical/ellipsoid cloud
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 20 + Math.random() * 35; // hollow sphere center to prevent star clutter directly behind UI text

      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      // Interpolate colors for a beautiful nebula look
      let mixedColor = color1.clone();
      const rand = Math.random();
      if (rand < 0.45) {
        mixedColor.lerp(color2, Math.random());
      } else if (rand < 0.9) {
        mixedColor.lerp(color3, Math.random());
      } else {
        mixedColor = new THREE.Color(0xffffff);
      }

      starColors[i * 3] = mixedColor.r;
      starColors[i * 3 + 1] = mixedColor.g;
      starColors[i * 3 + 2] = mixedColor.b;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    // Particle Texture (create a circular particle dynamically)
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 16;
    pCanvas.height = 16;
    const pCtx = pCanvas.getContext('2d');
    if (pCtx) {
      const grad = pCtx.createRadialGradient(8, 8, 0, 8, 8, 8);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.3, 'rgba(255,255,255,0.8)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      pCtx.fillStyle = grad;
      pCtx.fillRect(0, 0, 16, 16);
    }
    const starTexture = new THREE.CanvasTexture(pCanvas);

    const starsMaterial = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      map: starTexture,
      depthWrite: false
    });

    const starField = new THREE.Points(starsGeometry, starsMaterial);
    mainGroup.add(starField);

    // Create Floating 3D Data Shards (Double-layered: translucent glossy core + wireframe shell)
    const shardCount = isMobile ? 3 : 7;
    const shards: THREE.Group[] = [];
    const shardGeometries = [
      new THREE.IcosahedronGeometry(1.5, 0),
      new THREE.OctahedronGeometry(1.2, 0),
      new THREE.DodecahedronGeometry(1.0, 0)
    ];

    // Materials
    const coreMaterial = new THREE.MeshPhongMaterial({
      color: 0x0a192f,
      emissive: 0x083b5c,
      specular: 0x00ffff,
      shininess: 100,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });

    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });

    const shardGroup = new THREE.Group();
    mainGroup.add(shardGroup);

    for (let i = 0; i < shardCount; i++) {
      const geom = shardGeometries[i % shardGeometries.length];
      const shardAssembly = new THREE.Group();

      // 1. Inner solid translucent core
      const coreMesh = new THREE.Mesh(geom, coreMaterial);
      shardAssembly.add(coreMesh);

      // 2. Outer glowing wireframe shell (slightly scaled up to prevent Z-fighting)
      const wireMesh = new THREE.Mesh(geom, wireframeMaterial);
      wireMesh.scale.setScalar(1.01);
      shardAssembly.add(wireMesh);

      // Position shards in space around the screen borders
      shardAssembly.position.set(
        (Math.random() - 0.5) * 35,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20
      );

      // Random speed and rotations
      shardAssembly.userData = {
        rotSpeedX: (Math.random() - 0.5) * 0.008,
        rotSpeedY: (Math.random() - 0.5) * 0.008,
        rotSpeedZ: (Math.random() - 0.5) * 0.004,
        driftSpeedY: 0.002 + Math.random() * 0.005,
        driftRange: 3 + Math.random() * 4,
        startY: shardAssembly.position.y
      };

      shardGroup.add(shardAssembly);
      shards.push(shardAssembly);
    }

    // Set up lighting (ambient light + colored point lights to highlight crystal facets)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.05);
    scene.add(ambientLight);

    const cyanLight = new THREE.PointLight(0x06b6d4, 15, 60);
    cyanLight.position.set(-15, 10, 15);
    scene.add(cyanLight);

    const purpleLight = new THREE.PointLight(0x8b5cf6, 15, 60);
    purpleLight.position.set(15, -10, 15);
    scene.add(purpleLight);

    // Mouse Tracking Parallax setup
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    const handleMouseMove = (event: MouseEvent) => {
      mouse.targetX = (event.clientX / window.innerWidth - 0.5) * 2;
      mouse.targetY = -(event.clientY / window.innerHeight - 0.5) * 2;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Initial Intro Animation using GSAP
    container.style.opacity = '0';
    gsap.to(container, {
      opacity: 1,
      duration: 2.5,
      ease: 'power2.out'
    });

    // Animate camera entry
    gsap.from(camera.position, {
      z: 50,
      duration: 3,
      ease: 'power3.out'
    });

    // Handle Window Resizing
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse interpolation (Lerp)
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      // Parallax effect on groups
      mainGroup.rotation.y = mouse.x * 0.15;
      mainGroup.rotation.x = -mouse.y * 0.15;

      // Rotate starfield slowly
      starField.rotation.y = elapsedTime * 0.015;

      // Drifting and rotating shards
      shards.forEach((shard) => {
        shard.rotation.x += shard.userData.rotSpeedX;
        shard.rotation.y += shard.userData.rotSpeedY;
        shard.rotation.z += shard.userData.rotSpeedZ;

        // Oscillate height (floating effect)
        shard.position.y = shard.userData.startY + Math.sin(elapsedTime * shard.userData.driftSpeedY * 5) * shard.userData.driftRange;
      });

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup functions
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);

      // Clean resources
      starsGeometry.dispose();
      starsMaterial.dispose();
      starTexture.dispose();
      shardGeometries.forEach((g) => g.dispose());
      coreMaterial.dispose();
      wireframeMaterial.dispose();

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full pointer-events-none opacity-0 z-0 overflow-hidden"
      style={{ mixBlendMode: 'screen' }}
    />
  );
};
