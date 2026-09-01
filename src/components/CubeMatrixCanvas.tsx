import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { MatrixSettings } from '../types';
import { createCubeMaterial, ShaderUniforms } from '../utils/shaders';
import { TerrainEngine } from '../utils/terrainEngine';
import logoAUrl from '../assets/Logo_A.png';

interface Props {
  settings: MatrixSettings;
}

export const CubeMatrixCanvas: React.FC<Props> = ({ settings }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const instancedMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const uniformsRef = useRef<ShaderUniforms | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);

  const terrainEngineRef = useRef<TerrainEngine>(new TerrainEngine());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Setup Scene, Camera, Renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color('#000000');

    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 1000);
    cameraRef.current = camera;

    // Three-quarter isometric/cinematic perspective framing (lowered slightly for depth)
    camera.position.set(-3.8, 4.0, 7.2);
    camera.lookAt(new THREE.Vector3(0.8, 1.40, 1.8));

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.55;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.zIndex = '1';
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // 2. Post-processing Composer Setup for Electric Blue Seam Bloom Only
    const composer = new EffectComposer(renderer);
    composerRef.current = composer;

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.08,  // Bloom Strength: barely perceptible tight glow on seams
      0.08,  // Radius: tight aura around seams only
      0.92   // Threshold: affects ONLY intense electric blue seams
    );
    composer.addPass(bloomPass);
    bloomPassRef.current = bloomPass;

    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    // 3. Cinematic Studio Lighting
    const ambientLight = new THREE.AmbientLight(0x06070a, 0.15);
    scene.add(ambientLight);

    // Soft neutral overhead key light
    const dirLight = new THREE.DirectionalLight(0xd0d8e8, 0.40);
    dirLight.position.set(15, 30, 20);
    scene.add(dirLight);

    // Subtle dark cool rim light
    const accentLight = new THREE.DirectionalLight(0x101520, 0.10);
    accentLight.position.set(-20, 10, -15);
    scene.add(accentLight);

    // 4. Initialize Terrain Engine (96x48 Cuboid Grid)
    const COLS = settings.gridCols; // 96
    const ROWS = settings.gridRows; // 48
    const size = settings.cubeSize;
    const gap = settings.cubeGap;
    const totalCubes = COLS * ROWS;

    const terrainEngine = terrainEngineRef.current;
    terrainEngine.init(COLS, ROWS, size, gap);

    // 5. Geometry and Custom Material
    const geometry = new THREE.BoxGeometry(size, size, size);
    // Anchor bottom face at Y = 0 so vertical scaling always grows upward from base
    geometry.translate(0, size / 2, 0);

    // Instanced logoType attribute (0 = background, 1 = white left stem, 2 = electric blue right stem/crossbar)
    const logoTypeArray = new Float32Array(totalCubes);
    const outerEdgesArray = new Float32Array(totalCubes * 4);
    const diagMetricArray = new Float32Array(totalCubes);
    for (let i = 0; i < totalCubes; i++) {
      const cuboid = terrainEngine.cuboids[i];
      logoTypeArray[i] = cuboid.logoType;
      const edges = cuboid.outerEdges || [0, 0, 0, 0];
      outerEdgesArray[i * 4 + 0] = edges[0];
      outerEdgesArray[i * 4 + 1] = edges[1];
      outerEdgesArray[i * 4 + 2] = edges[2];
      outerEdgesArray[i * 4 + 3] = edges[3];

      const normX = cuboid.column / COLS;
      const normZ = 1.0 - cuboid.row / ROWS;
      diagMetricArray[i] = cuboid.isLogo ? cuboid.layerMetric : (normX * 0.55 + normZ * 0.45);
    }
    geometry.setAttribute('aLogoType', new THREE.InstancedBufferAttribute(logoTypeArray, 1));
    geometry.setAttribute('aOuterEdges', new THREE.InstancedBufferAttribute(outerEdgesArray, 4));
    geometry.setAttribute('aDiagMetric', new THREE.InstancedBufferAttribute(diagMetricArray, 1));

    const lightDir = new THREE.Vector3(15, 30, 20).normalize();
    const uniforms: ShaderUniforms = {
      uTime: { value: 0 },
      uGlowColor: { value: new THREE.Color('#004ef3') },
      uLightDirection: { value: lightDir },
    };
    uniformsRef.current = uniforms;

    const material = createCubeMaterial(uniforms);

    // 6. Instanced Mesh
    const instancedMesh = new THREE.InstancedMesh(geometry, material, totalCubes);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < totalCubes; i++) {
      const cuboid = terrainEngine.cuboids[i];
      dummy.position.set(cuboid.worldX, 0, cuboid.worldZ);
      dummy.scale.set(1.0, cuboid.currentScale, 1.0);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    scene.add(instancedMesh);
    instancedMeshRef.current = instancedMesh;

    // 6b. Logo_A.png High-Res Overlay Plane (Matching exact 3D voxel logo dimensions & position)
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    const step = size + gap;
    for (let i = 0; i < totalCubes; i++) {
      const c = terrainEngine.cuboids[i];
      if (c.isLogo) {
        if (c.worldX < minX) minX = c.worldX;
        if (c.worldX > maxX) maxX = c.worldX;
        if (c.worldZ < minZ) minZ = c.worldZ;
        if (c.worldZ > maxZ) maxZ = c.worldZ;
      }
    }

    const logoWidth = (maxX - minX) + step;
    const logoDepth = (maxZ - minZ) + step;
    const logoCenterX = (minX + maxX) / 2;
    const logoCenterZ = (minZ + maxZ) / 2;

    // Create 1x1 transparent canvas texture placeholder so material has USE_MAP from frame 0
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const placeholderTex = new THREE.CanvasTexture(canvas);

    const logoOverlayGeo = new THREE.PlaneGeometry(logoWidth, logoDepth);
    const logoOverlayMat = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: placeholderTex },
        uProgress: { value: 0.0 },
        uStompScale: { value: 1.0 },
        uOpacity: { value: 0.0 },
        uFlashDissipate: { value: 0.0 },
        uFlashPeak: { value: 0.0 },
        uLogoReveal: { value: 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        uniform float uStompScale;

        void main() {
          // Flip UVs horizontally and vertically to match the 3D voxel grid orientation
          vUv = vec2(1.0 - uv.x, 1.0 - uv.y);
          vec3 pos = position;
          // Stomp impact scaling centered on local plane
          pos.x *= uStompScale;
          pos.y *= uStompScale;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform float uProgress;
        uniform float uOpacity;
        uniform float uFlashDissipate;
        uniform float uFlashPeak;
        uniform float uLogoReveal;
        varying vec2 vUv;

        void main() {
          vec4 texColor = texture2D(uTexture, vUv);

          // Box distance from center (1.0 at outer edge, 0.0 at center)
          vec2 d = abs(vUv - vec2(0.5)) * 2.0;
          float distFromEdge = max(d.x, d.y);

          // Outside-In wipe threshold sweeps from 1.0 down to -0.25 as uProgress goes 0.0 -> 1.0
          float threshold = 1.0 - uProgress * 1.25;
          float alphaMask = smoothstep(threshold - 0.15, threshold, distFromEdge);

          // Multi-layer perimeter sampling following the exact contour of the A logo:
          // 1. Inner soft halo (~3-4px around A contour)
          float innerOffset = 0.0035 * uFlashPeak;
          float innerSamples = 0.0;
          if (innerOffset > 0.0001) {
            innerSamples += texture2D(uTexture, vUv + vec2(innerOffset, 0.0)).a;
            innerSamples += texture2D(uTexture, vUv - vec2(innerOffset, 0.0)).a;
            innerSamples += texture2D(uTexture, vUv + vec2(0.0, innerOffset)).a;
            innerSamples += texture2D(uTexture, vUv - vec2(0.0, innerOffset)).a;
            innerSamples += texture2D(uTexture, vUv + vec2(innerOffset, innerOffset) * 0.707).a;
            innerSamples += texture2D(uTexture, vUv - vec2(innerOffset, innerOffset) * 0.707).a;
            innerSamples += texture2D(uTexture, vUv + vec2(-innerOffset, innerOffset) * 0.707).a;
            innerSamples += texture2D(uTexture, vUv + vec2(innerOffset, -innerOffset) * 0.707).a;
            innerSamples /= 8.0;
          }

          // 2. Outer subtle bloom (~8-10px around A contour with AIDN cool-blue tint)
          float outerOffset = 0.0085 * uFlashPeak;
          float outerSamples = 0.0;
          if (outerOffset > 0.0001) {
            outerSamples += texture2D(uTexture, vUv + vec2(outerOffset, 0.0)).a;
            outerSamples += texture2D(uTexture, vUv - vec2(outerOffset, 0.0)).a;
            outerSamples += texture2D(uTexture, vUv + vec2(0.0, outerOffset)).a;
            outerSamples += texture2D(uTexture, vUv - vec2(0.0, outerOffset)).a;
            outerSamples /= 4.0;
          }

          float coreAlpha = texColor.a;
          float innerHaloAlpha = clamp(innerSamples, 0.0, 1.0);
          float outerBloomAlpha = clamp(outerSamples, 0.0, 1.0);

          // Rapid falloff into absolute black outside the A contour and immediate halo
          float flashAlpha = max(
            coreAlpha,
            max(innerHaloAlpha * 0.50, outerBloomAlpha * 0.18) * uFlashPeak
          );

          float totalAlpha = flashAlpha * alphaMask * uOpacity;
          if (totalAlpha < 0.002) discard;

          // Original base logo colors (unmodified Logo_A.png asset)
          vec3 baseRgb = texColor.rgb;
          bool isWhite = (texColor.r > 0.75 && texColor.g > 0.75 && texColor.b > 0.75);
          if (isWhite) {
            baseRgb *= 0.88; // Crisp white
          } else {
            baseRgb *= 1.15; // Official AIDN Blue (#004DF3)
          }

          // Multi-layer flash color composition:
          // 1. Core of the A: Soft icy white #DCE6F5 (220, 230, 245) gently approaching bright white at peak
          vec3 icyWhiteCore = vec3(0.8627, 0.9020, 0.9608) * 1.18;
          // 2. Immediate inner halo: Softer cool-white/blue-white
          vec3 coolWhiteHalo = vec3(0.72, 0.80, 0.93) * 1.10;
          // 3. Subtle outer bloom: Cool blue tint connecting with AIDN brand color
          vec3 coolBlueBloom = vec3(0.12, 0.38, 0.92) * 0.85;

          // Layered color blend based on distance from core
          vec3 flashRgb = mix(coolBlueBloom, coolWhiteHalo, innerHaloAlpha);
          flashRgb = mix(flashRgb, icyWhiteCore, smoothstep(0.1, 0.8, coreAlpha));

          // Smooth transition during flash peak & decay back to original logo colors
          vec3 finalRgb = mix(flashRgb, baseRgb, uLogoReveal);

          gl_FragColor = vec4(finalRgb, totalAlpha);
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const logoOverlayMesh = new THREE.Mesh(logoOverlayGeo, logoOverlayMat);
    // Positioned at top height of logo voxels (Y = 0.895) with X offset (-0.1) and Z offset (-0.23)
    const xOffsetCorrection = 0.1;
    const zOffsetCorrection = -0.23;
    logoOverlayMesh.position.set(logoCenterX + xOffsetCorrection, 0.895, logoCenterZ + zOffsetCorrection);
    logoOverlayMesh.rotation.x = -Math.PI / 2; // Flat on X-Z plane, facing UP towards camera
    logoOverlayMesh.rotation.z = 0;
    logoOverlayMesh.renderOrder = 999;
    logoOverlayMesh.frustumCulled = false;
    logoOverlayMesh.visible = false;
    scene.add(logoOverlayMesh);

    const textureLoader = new THREE.TextureLoader();
    const applyTexture = (tex: THREE.Texture) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      logoOverlayMat.uniforms.uTexture.value = tex;

      const img = tex.image as HTMLImageElement;
      if (img && img.width && img.height) {
        try {
          const cvs = document.createElement('canvas');
          cvs.width = img.width;
          cvs.height = img.height;
          const ctx = cvs.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, img.width, img.height);
            const data = imgData.data;
            let minX = img.width, maxX = 0, minY = img.height, maxY = 0;
            for (let y = 0; y < img.height; y++) {
              for (let x = 0; x < img.width; x++) {
                const a = data[(y * img.width + x) * 4 + 3];
                if (a > 10) {
                  if (x < minX) minX = x;
                  if (x > maxX) maxX = x;
                  if (y < minY) minY = y;
                  if (y > maxY) maxY = y;
                }
              }
            }
            if (maxX > minX && maxY > minY) {
              const fracW = (maxX - minX + 1) / img.width;
              const fracH = (maxY - minY + 1) / img.height;
              const scaleX = 1.0 / fracW;
              const scaleY = 1.0 / fracH;
              logoOverlayMesh.scale.set(scaleX, scaleY, 1.0);

              const artCenterX = (minX + maxX) / 2;
              const artCenterY = (minY + maxY) / 2;
              const offsetX = (artCenterX / img.width - 0.5) * logoWidth;
              const offsetZ = (artCenterY / img.height - 0.5) * logoDepth;
              logoOverlayMesh.position.set(
                logoCenterX - offsetX + xOffsetCorrection,
                0.895,
                logoCenterZ + offsetZ + zOffsetCorrection
              );
            }
          }
        } catch (e) {
          console.warn('Canvas bound detection skipped:', e);
        }
      }
    };

    const loadLogoTexture = () => {
      const filename = logoAUrl.split('/').pop() || 'Logo_A.png';
      const baseUrl = import.meta.env.BASE_URL || './';
      const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
      
      const pathname = window.location.pathname;
      const dirPath = pathname.endsWith('/') ? pathname : pathname.substring(0, pathname.lastIndexOf('/') + 1);

      const candidates = [
        logoAUrl,
        `${cleanBase}assets/${filename}`,
        `${cleanBase}Logo_A.png`,
        `${dirPath}assets/${filename}`,
        `${dirPath}Logo_A.png`,
        './Logo_A.png',
        'Logo_A.png',
      ];

      const uniqueCandidates = Array.from(new Set(candidates.filter(Boolean)));
      let candidateIndex = 0;

      const tryNextCandidate = () => {
        if (candidateIndex >= uniqueCandidates.length) {
          console.error('All Logo_A asset candidate URLs failed to load.');
          return;
        }

        const src = uniqueCandidates[candidateIndex++];
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          console.log(`Logo_A texture loaded successfully from candidate: ${src}`);
          const tex = new THREE.Texture(img);
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.needsUpdate = true;
          applyTexture(tex);
        };

        img.onerror = (e) => {
          console.warn(`Failed to load Logo_A from candidate: ${src}, trying next...`, e);
          tryNextCandidate();
        };

        img.src = src;
      };

      tryNextCandidate();
    };

    loadLogoTexture();

    // Window Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // 7. Deterministic Render Loop
    let animFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);

      const deltaTime = Math.min(clock.getDelta(), 0.1);
      const elapsedTime = clock.getElapsedTime();

      if (uniformsRef.current) {
        uniformsRef.current.uTime.value = terrainEngine.animationTime;
      }

      // Update terrain cuboid animation
      terrainEngine.update(deltaTime);

      // Update Camera Transform according to sequence timeline
      if (cameraRef.current) {
        const aspect = cameraRef.current.aspect;
        const camTransform = terrainEngine.getCameraTransform(terrainEngine.animationTime, aspect);
        cameraRef.current.position.copy(camTransform.position);
        cameraRef.current.lookAt(camTransform.lookAt);
      }

      const t = terrainEngine.animationTime;

      // Toggle instanced voxel mesh visibility: hide completely at t >= 14.85s when flash ignites & voxels vanish
      if (instancedMeshRef.current) {
        if (t >= 14.85 && t < 22.8) {
          instancedMeshRef.current.visible = false;
        } else {
          instancedMeshRef.current.visible = true;
        }
      }

      // Flash peak curve (t = 14.85s – 16.25s)
      let flashPeak = 0.0;
      if (t >= 14.85 && t < 15.20) {
        const rampUp = (t - 14.85) / 0.35;
        flashPeak = Math.sin(rampUp * (Math.PI / 2));
      } else if (t >= 15.20 && t < 15.55) {
        flashPeak = 1.0;
      } else if (t >= 15.55 && t <= 16.25) {
        const fadeOut = (t - 15.55) / 0.70;
        flashPeak = Math.cos(fadeOut * (Math.PI / 2));
      }
      flashPeak = Math.pow(Math.max(0.0, flashPeak), 1.6);

      // Tone mapping exposure strictly constant at 0.55 to prevent any screen/terrain white wash
      if (rendererRef.current) {
        if (t < 1.2) {
          rendererRef.current.toneMappingExposure = 0.55 * (t / 1.2);
        } else if (t > 22.2) {
          // Smooth fade out during final 0.6s of the 7s hold before loop restarts
          const fadeOut = Math.max(0.0, (22.8 - t) / 0.6);
          rendererRef.current.toneMappingExposure = 0.55 * fadeOut;
        } else {
          rendererRef.current.toneMappingExposure = 0.55;
        }
      }

      // Bloom strength stays at subtle 0.10 for crisp localized bloom around the glowing A silhouette
      if (bloomPassRef.current) {
        bloomPassRef.current.strength = 0.10;
      }

      // Update Logo_A.png overlay animation (ignites flash at 14.85s as voxels vanish, then reveals official logo)
      if (logoOverlayMat && logoOverlayMesh) {
        const currentTex = logoOverlayMat.uniforms.uTexture.value;
        const hasMap = !!currentTex && currentTex !== placeholderTex;

        if (!hasMap || t < 14.85) {
          logoOverlayMesh.visible = false;
          logoOverlayMat.uniforms.uProgress.value = 0.0;
          logoOverlayMat.uniforms.uOpacity.value = 0.0;
          logoOverlayMat.uniforms.uStompScale.value = 1.0;
          logoOverlayMat.uniforms.uFlashPeak.value = 0.0;
          logoOverlayMat.uniforms.uLogoReveal.value = 0.0;
        } else if (t < 15.20) {
          // 14.85s -> 15.20s: Flash ignites smoothly in 350ms as voxels vanish
          logoOverlayMesh.visible = true;
          const p = (t - 14.85) / 0.35;
          const scaleExpand = 1.0 + 0.135 * Math.sin(p * (Math.PI / 2));

          logoOverlayMat.uniforms.uProgress.value = 1.0;
          logoOverlayMat.uniforms.uOpacity.value = 1.0;
          logoOverlayMat.uniforms.uStompScale.value = scaleExpand;
          logoOverlayMat.uniforms.uFlashPeak.value = flashPeak;
          logoOverlayMat.uniforms.uLogoReveal.value = 0.0;
        } else if (t < 15.55) {
          // 15.20s -> 15.55s: Flash holds peak icy white mask with localized bloom
          logoOverlayMesh.visible = true;
          const scaleExpand = 1.0 + 0.135;

          logoOverlayMat.uniforms.uProgress.value = 1.0;
          logoOverlayMat.uniforms.uOpacity.value = 1.0;
          logoOverlayMat.uniforms.uStompScale.value = scaleExpand;
          logoOverlayMat.uniforms.uFlashPeak.value = 1.0;
          logoOverlayMat.uniforms.uLogoReveal.value = 0.0;
        } else if (t <= 16.25) {
          // 15.55s -> 16.25s: Flash dissipates over 700ms, revealing official logo underneath with AIDN blue #004DF3
          logoOverlayMesh.visible = true;
          const p = (t - 15.55) / 0.70;
          const scaleContract = 1.0 + 0.135 * Math.max(0.0, 1.0 - p);

          logoOverlayMat.uniforms.uProgress.value = 1.0;
          logoOverlayMat.uniforms.uOpacity.value = 1.0;
          logoOverlayMat.uniforms.uStompScale.value = scaleContract;
          logoOverlayMat.uniforms.uFlashPeak.value = flashPeak;
          logoOverlayMat.uniforms.uLogoReveal.value = 0.0;
        } else {
          logoOverlayMesh.visible = true;
          logoOverlayMat.uniforms.uProgress.value = 1.0;
          const fadeOut = t > 22.2 ? Math.max(0.0, (22.8 - t) / 0.6) : 1.0;
          logoOverlayMat.uniforms.uOpacity.value = fadeOut;
          logoOverlayMat.uniforms.uStompScale.value = 1.0;
          logoOverlayMat.uniforms.uFlashPeak.value = 0.0;
          logoOverlayMat.uniforms.uLogoReveal.value = 1.0;
        }
      }

      // Update instanced mesh matrices
      if (instancedMeshRef.current) {
        for (let i = 0; i < totalCubes; i++) {
          const cuboid = terrainEngine.cuboids[i];
          dummy.position.set(cuboid.worldX, 0, cuboid.worldZ);
          const hScale = cuboid.horizontalScale ?? 1.0;
          dummy.scale.set(hScale, cuboid.currentScale, hScale);
          dummy.updateMatrix();
          instancedMeshRef.current.setMatrixAt(i, dummy.matrix);
        }
        instancedMeshRef.current.instanceMatrix.needsUpdate = true;
      }

      composer.render();
    };

    animate();

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current && rendererRef.current.domElement) {
        container.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, [settings.gridCols, settings.gridRows, settings.cubeSize, settings.cubeGap]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-black select-none"
    />
  );
};


