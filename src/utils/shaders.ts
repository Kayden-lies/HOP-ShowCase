import * as THREE from 'three';

export interface ShaderUniforms extends Record<string, THREE.IUniform> {
  uTime: { value: number };
  uGlowColor: { value: THREE.Color };
  uLightDirection: { value: THREE.Vector3 };
}

export const createCubeMaterial = (uniforms: ShaderUniforms) => {
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      attribute float aLogoType;
      attribute vec4 aOuterEdges; // x: Left, y: Right, z: Top, w: Bottom
      attribute float aDiagMetric;

      varying vec3 vNormal;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      varying vec3 vViewPosition;
      varying vec2 vUv;
      varying float vLocalY;
      varying float vLogoType;
      varying vec4 vOuterEdges;
      varying float vDiagMetric;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vWorldNormal = normalize((modelMatrix * instanceMatrix * vec4(normal, 0.0)).xyz);
        vUv = uv;
        vLocalY = position.y; // Ranges from -0.5 (bottom) to +0.5 (top) of box geometry
        vLogoType = aLogoType;
        vOuterEdges = aOuterEdges;
        vDiagMetric = aDiagMetric;
        
        // Instance transformation matrix
        vec4 instancePos = instanceMatrix * vec4(position, 1.0);
        vec4 worldPosition = modelMatrix * instancePos;
        vWorldPosition = worldPosition.xyz;

        vec4 mvPosition = viewMatrix * worldPosition;
        vViewPosition = -mvPosition.xyz;

        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uGlowColor;
      uniform vec3 uLightDirection;

      varying vec3 vNormal;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      varying vec3 vViewPosition;
      varying vec2 vUv;
      varying float vLocalY;
      varying float vLogoType;
      varying vec4 vOuterEdges;
      varying float vDiagMetric;

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 worldNormal = normalize(vWorldNormal);
        vec3 viewDir = normalize(vViewPosition);

        float isTop = step(0.7, worldNormal.y);
        float isBottom = step(0.7, -worldNormal.y);
        float isSide = 1.0 - isTop - isBottom;

        // Timeline Clamped at 17.0s (Infinite Final Hold)
        float cycleTime = min(uTime, 17.0);
        bool isLogo = vLogoType > 0.5;

        // --- CAMERA ASCENT & ANGLE MATERIAL RESPONSE ---
        float cameraAscent = smoothstep(0.0, 10.0, cycleTime);
        float cameraCompensation = mix(1.0, 1.35, cameraAscent);

        // --- HEIGHT VARIATION ---
        float heightFactor = 1.0 + clamp(vWorldPosition.y * 0.12, 0.0, 0.15);

        // --- SIDE FACE EDGE DEFINITION ---
        float edgeDistX = abs(vUv.x - 0.5);
        float edgeDistY = abs(vUv.y - 0.5);
        float edgeDist = max(edgeDistX, edgeDistY);
        float sideEdgeGlow = smoothstep(0.15, 0.48, edgeDist);

        // --- BASE CUBE EDGE DEFINITION ---
        float edgeX = smoothstep(0.06, 0.01, vUv.x) + smoothstep(0.94, 0.99, vUv.x);
        float edgeY = smoothstep(0.06, 0.01, vUv.y) + smoothstep(0.94, 0.99, vUv.y);
        float isEdge = clamp(edgeX + edgeY, 0.0, 1.0);

        vec3 electricBlue = vec3(0.000, 0.30196, 0.95294);

        // --- SUBTLE ENVIRONMENT EMISSIVE ---
        float baseEmissiveIntensity = 0.028 * cameraCompensation * heightFactor;
        vec3 subtleSideEmissive = electricBlue * isSide * sideEdgeGlow * baseEmissiveIntensity;

        // --- TIMELINE PHASES & CUBE ACTIVATION PERSONALITY ---
        float topDownProgress = smoothstep(9.5, 11.2, cycleTime);
        float nonLogoFade = isLogo ? 1.0 : (1.0 - topDownProgress * 0.90);

        float activation = isLogo ? smoothstep(6.5, 11.0, cycleTime) : 0.0;

        // Staggered Start/End times per cuboid based on construction wave (6.5s to 11.0s)
        float cubeStart = 6.5 + vDiagMetric * 3.4;
        float moveDuration = 1.10;
        float cubeEnd = cubeStart + moveDuration;

        // 1. Activation Wake-Up Pulse (200ms before movement starts) & Powered Movement Lines
        vec3 precisionBlue = vec3(0.000, 0.30196, 0.95294);
        float energySignal = 0.0;
        float seamGlowSignal = 0.0;
        float edgeHighlightBoost = 0.0;

        if (isLogo) {
          float actStart = cubeStart - 0.20;
          float fadeEnd = cubeEnd + 0.15;

          if (cycleTime >= actStart && cycleTime < fadeEnd) {
            float actP = clamp((cycleTime - actStart) / 0.20, 0.0, 1.0);
            float moveP = clamp((cycleTime - cubeStart) / moveDuration, 0.0, 1.0);
            float settleP = smoothstep(cubeEnd, fadeEnd, cycleTime);
            float arrivalFade = 1.0 - settleP;

            // Faint pulse traveling upward along the cube (200ms)
            float pulseY = actP;
            float pulseWave = smoothstep(0.16, 0.01, abs(vUv.y - pulseY)) * (1.0 - step(1.0, actP));

            // Precision vertical panel edge line (1-2px in UV space)
            float vertEdgeDist = min(vUv.x, 1.0 - vUv.x);
            float thinEdgeLine = smoothstep(0.035, 0.005, vertEdgeDist) * isSide;

            // Activation line illuminated as pulse travels upward
            float actEnergy = thinEdgeLine * pulseWave * 1.35;

            // Sustained subtle energy line while rising
            float moveEnergy = thinEdgeLine * step(0.0, moveP) * (1.0 - step(1.0, moveP)) * 0.60;

            energySignal = (actEnergy + moveEnergy) * arrivalFade;

            // Faint blue seam glow along bottom face / side junction
            float bottomSeam = smoothstep(0.18, 0.02, vUv.y) * isSide;
            seamGlowSignal = bottomSeam * (step(0.0, moveP) * (1.0 - step(1.0, moveP)) * 0.35 + pulseWave * 0.25) * arrivalFade;

            // Architectural corner edge highlight boost during movement
            edgeHighlightBoost = isEdge * step(0.0, moveP) * (1.0 - step(1.0, moveP)) * 0.12 * arrivalFade;
          }
        }

        // 2. Solid Color Fill (t = 11.8s - 12.8s) -> 3. 1s Delay (t = 12.8s - 13.8s)
        float brandFillProgress = isLogo ? smoothstep(11.8, 12.8, cycleTime) : 0.0;

        // 4. Instant Piece Merge Phase (t = 13.8s: snaps in 1-2 frames into solid monolithic geometry)
        // 5. Hold solid monolithic geometry (t = 13.82s - 15.15s)
        float mergeProgress = isLogo ? smoothstep(13.8, 13.82, cycleTime) : 0.0;

        // 6. Icy Blue-White Flash & Disappear Phase
        // Flash ignites smoothly from 14.85s to 15.20s (350ms brief ramp up)
        // At t = 15.20s: Flash reaches peak, and ALL voxels/cube plane vanish without a trace
        // t = 15.20s -> 15.55s: Solid icy white flash mask holds
        // t = 15.55s -> 16.25s: Flash dissipates smoothly over 700ms to reveal official colored logo
        float flashPeakVal = 0.0;
        if (cycleTime >= 14.85 && cycleTime < 15.20) {
          float rampUp = (cycleTime - 14.85) / 0.35;
          flashPeakVal = sin(rampUp * 1.570796326); // 0.0 -> 1.0 smooth sine
        } else if (cycleTime >= 15.20 && cycleTime < 15.55) {
          flashPeakVal = 1.0; // Solid icy white mask holds
        } else if (cycleTime >= 15.55 && cycleTime <= 16.25) {
          float fadeOut = (cycleTime - 15.55) / 0.70;
          flashPeakVal = cos(fadeOut * 1.570796326); // 1.0 -> 0.0 smooth cosine
        }
        float flashPeak = pow(clamp(flashPeakVal, 0.0, 1.0), 1.6); // Sharp blinding curve

        // All voxels and cube plane vanish completely at t = 14.85s mark as flash ignites
        float disappearProgress = step(14.85, cycleTime);

        // --- MATERIAL PROPERTIES ---
        // Deep matte black base for cubes when A forms
        vec3 unactivatedTop  = vec3(0.010, 0.011, 0.013);
        vec3 unactivatedBody = vec3(0.016, 0.017, 0.020);

        vec3 darkLogoTop  = vec3(0.020, 0.022, 0.026);
        vec3 darkLogoBody = vec3(0.025, 0.027, 0.032);

        // Cool icy white #DCE6F5 (RGB: 220, 230, 245)
        vec3 icyWhiteColor    = vec3(0.8627, 0.9020, 0.9608);
        vec3 whiteLogoColor   = vec3(0.82, 0.83, 0.85);
        vec3 whiteFlashTarget = mix(whiteLogoColor, icyWhiteColor * 1.35, flashPeak);

        vec3 targetFlashColor = icyWhiteColor * 1.25;
        vec3 activeWhiteColor = mix(whiteLogoColor, whiteFlashTarget, flashPeak * 0.90);

        // --- BASE UNACTIVATED LIGHTING & BASE COLOR ---
        vec3 currentTop  = mix(unactivatedTop, darkLogoTop, activation);
        vec3 currentBody = mix(unactivatedBody, darkLogoBody, activation);

        vec3 baseColor = mix(currentBody, currentTop, isTop) * nonLogoFade * (1.0 - disappearProgress);

        // --- LIGHTING & SPECULAR ---
        vec3 keyLightDir = normalize(vec3(0.2, 0.9, 0.3));
        float diffKey = max(dot(worldNormal, keyLightDir), 0.0);

        float topSoftHighlight = isTop * cameraAscent * 0.12 * diffKey * nonLogoFade * (1.0 - disappearProgress);

        float specPower = mix(16.0, 48.0, brandFillProgress);
        float specIntensity = mix(0.02, 0.22, brandFillProgress) * nonLogoFade * (1.0 - disappearProgress);

        vec3 halfDir = normalize(keyLightDir + viewDir);
        float spec = pow(max(dot(normal, halfDir), 0.0), specPower) * isTop * specIntensity;

        // Base dark lit material (identical for ALL blocks at start)
        vec3 baseLitMaterial = baseColor * (diffKey * 0.50 + 0.50) + vec3(topSoftHighlight) + vec3(spec);

        // --- ALL VOXELS IN A FORMATION ARE WHITE ---
        vec3 whiteTop  = activeWhiteColor * 0.55;
        vec3 whiteBody = activeWhiteColor * 0.42;
        vec3 whiteBase = mix(whiteBody, whiteTop, isTop) * (1.0 - disappearProgress);
        vec3 whiteLit  = whiteBase * (diffKey * 0.50 + 0.50) + vec3(topSoftHighlight) + vec3(spec);

        vec3 litMaterial = mix(baseLitMaterial, whiteLit, brandFillProgress) * (1.0 - disappearProgress);

        // At flash peak, override logo voxels with solid unlit icy white (obscures internal geometry/seams)
        if (isLogo) {
          vec3 solidFlashColor = icyWhiteColor * 1.55 * (1.0 - disappearProgress);
          litMaterial = mix(litMaterial, solidFlashColor, flashPeak);
        }

        // --- BASE CUBE EDGE HIGHLIGHT ---
        float baseEdgeHighlight = (isEdge * 0.03 + edgeHighlightBoost) * nonLogoFade * (1.0 - mergeProgress * 0.85) * (1.0 - disappearProgress);
        vec3 edgeHighlight = vec3(0.35, 0.40, 0.48) * baseEdgeHighlight;
        if (isLogo) {
          edgeHighlight *= (1.0 - flashPeak); // Hide edge highlights at peak flash
        }

        // Active side emissive for environment
        vec3 activeSideEmissive = subtleSideEmissive * nonLogoFade * (1.0 - disappearProgress);

        // Movement energy lines & seam glow (neutral white energy signal during voxel movement)
        vec3 neutralEnergyColor = vec3(0.85, 0.88, 0.92);
        vec3 energyLineEmissive = neutralEnergyColor * energySignal * (1.0 - disappearProgress);
        vec3 seamGlowEmissive   = neutralEnergyColor * seamGlowSignal * (1.0 - disappearProgress);

        // --- BLINDING FLASH RADIANCE EMISSIVE (STRICTLY LOGO-BOUND, ZERO TERRAIN WASH) ---
        vec3 blindingFlashEmissive = (isLogo ? targetFlashColor : vec3(0.0)) * flashPeak * 2.0 * (1.0 - disappearProgress);

        // --- FINAL COMPOSITION ---
        vec3 finalColor = (litMaterial + activeSideEmissive + edgeHighlight + energyLineEmissive + seamGlowEmissive + blindingFlashEmissive) * (1.0 - disappearProgress);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
  });
};
