import React, { useRef, useEffect, useState } from "react";

// Animation parameters for calm and processing states
const CALM = {
  ANGULAR_SPEED: 0.0005,
  SPIRAL_SPEED: 0.008,
  OSC_AMP_MIN: 2,
  OSC_AMP_MAX: 7,
  SPARK_PROBABILITY: 0.0005,
  SPARK_LIMIT: 1,
  RED_PARTICLE_RATIO: 0.3,
  RED_BRIGHTNESS: 1,
  BOND_COLOR: "rgba(80,80,80,0.18)",
  RED_BREATH_SPEED: [0.0007, 0.0012],
  RED_BREATH_AMP: 0.6,
  PARTICLE_COUNT: 1700,
  VORTEX_RADIUS: 180,
  RADIUS_WAVE_AMP: 0,
  RADIUS_WAVE_FREQ: 0,
  RIM_THICKNESS_MIN: 0.5,
  RIM_THICKNESS_MAX: 1.5,
};
const PROCESSING = {
  ANGULAR_SPEED: 0.0022,
  SPIRAL_SPEED: 0.016,
  OSC_AMP_MIN: 4,
  OSC_AMP_MAX: 12,
  SPARK_PROBABILITY: 0.002,
  SPARK_LIMIT: 3,
  RED_PARTICLE_RATIO: 0.55,
  RED_BRIGHTNESS: 1.5,
  BOND_COLOR: "rgba(230,1,0,0.22)",
  RED_BREATH_SPEED: [0.0015, 0.0025],
  RED_BREATH_AMP: 2.0,
  PARTICLE_COUNT: 3000,
  VORTEX_RADIUS: 180,
  RADIUS_WAVE_AMP: 1.5,
  RADIUS_WAVE_FREQ: 0.3,
  RIM_THICKNESS_MIN: 0.5,
  RIM_THICKNESS_MAX: 1.25,
};
const AWAITING = {
  ANGULAR_SPEED: 0.001,
  SPIRAL_SPEED: 0.0001,
  OSC_AMP_MIN: 1,
  OSC_AMP_MAX: 3,
  SPARK_PROBABILITY: 0.001,
  SPARK_LIMIT: 2,
  RED_PARTICLE_RATIO: 0.1,
  RED_BRIGHTNESS: 1,
  BOND_COLOR: "#0066b3", // blue cs
  RED_BREATH_SPEED: [0.001, 0.0025],
  RED_BREATH_AMP: 0.8,
  PARTICLE_COUNT: 1700,
  VORTEX_RADIUS: 169,
  RADIUS_WAVE_AMP: 0.5,
  RADIUS_WAVE_FREQ: 0.3,
  RIM_THICKNESS_MIN: 0.5, // perfect ring
  RIM_THICKNESS_MAX: 1.15, // perfect ring
};
const PARTICLE_SIZE = 1.5;
const RED_PARTICLE_RATIO = 0.3;
const BOND_DISTANCE = 15;
const SPARK_COOLDOWN = 300000;
const SPARK_FADE_DURATION = 700;
const SPARK_COLOR = "#E60000";
const BASE_PARTICLE_COLOR_CALM = "#B3B3B3"; // Calm, subtle grey with a hint of green tone.
const BASE_PARTICLE_COLOR_PROCESSING = "#000000";
const ELECTRIC_PARTICLE_COLOR = "#E60000";
const ELECTRIC_PARTICLE_RATIO = 0.2; // 20% become electric in processing
const BASE_PARTICLE_COLOR_AWAITING = "#0066b3"; // blue
const ELECTRIC_PARTICLE_COLOR_AWAITING = "#FFEA70"; // light blue
const RIM_ANIMATION_DURATION = 1500; // ms

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpColor(a, b, t) {
  // a, b: hex colors, t: 0-1
  const ah = a.replace("#", "");
  const bh = b.replace("#", "");
  const ar = parseInt(ah.substring(0, 2), 16);
  const ag = parseInt(ah.substring(2, 4), 16);
  const ab = parseInt(ah.substring(4, 6), 16);
  const br = parseInt(bh.substring(0, 2), 16);
  const bg = parseInt(bh.substring(2, 4), 16);
  const bb = parseInt(bh.substring(4, 6), 16);
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `rgb(${rr},${rg},${rb})`;
}

function createParticles(centerX, centerY, params, count, electricMode = false) {
  // Assign isElectric randomly for each session if electricMode is true
  return Array.from({ length: count }, () => {
    const isRed = Math.random() < params.RED_PARTICLE_RATIO;
    const isElectric = electricMode && Math.random() < ELECTRIC_PARTICLE_RATIO;
    return {
      angle: randomBetween(0, Math.PI * 2),
      // radius is now calculated dynamically
      normRadius: Math.random(), // persistent normalized radius
      speed: randomBetween(params.ANGULAR_SPEED * 0.7, params.ANGULAR_SPEED * 1.3),
      spiral: randomBetween(-params.SPIRAL_SPEED, params.SPIRAL_SPEED),
      phase: randomBetween(0, Math.PI * 2),
      oscSpeed: randomBetween(0.0007, 0.0015),
      oscAmp: randomBetween(params.OSC_AMP_MIN, params.OSC_AMP_MAX),
      isRed,
      isElectric,
      redPhase: randomBetween(0, Math.PI * 2),
      redBreathSpeed: randomBetween(0.0007, 0.0012),
    };
  });
}

/**
 * VortexAnimation
 * @param {"calm"|"processing"|"awaiting"} state - Animation state: calm, processing, or awaiting.
 */
const VortexAnimation = ({ width = 320, height = 320, state = "calm" }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef();
  const particlesRef = useRef();
  const timeRef = useRef(0);
  const bondSparkTimes = useRef(new Map());
  const activeSparks = useRef(new Map());
  // Smooth particle count state
  const [targetCount, setTargetCount] = useState(CALM.PARTICLE_COUNT);
  const [currentCount, setCurrentCount] = useState(CALM.PARTICLE_COUNT);
  const [transitionProgress, setTransitionProgress] = useState(0); // 0: calm, 1: processing, 2: awaiting

  // Helper to interpolate between three states
  function lerp3(a, b, c, t) {
    if (t < 1) return lerp(a, b, t);
    return lerp(b, c, t - 1);
  }

  // Map state to numeric progress for interpolation
  function stateToProgress(state) {
    if (state === "calm") return 0;
    if (state === "processing") return 1;
    if (state === "awaiting") return 2;
    return 0;
  }

  // Smoothly update target particle count on state change
  useEffect(() => {
    const progress = stateToProgress(state);
    setTransitionProgress(progress);
    if (progress < 1) setTargetCount(CALM.PARTICLE_COUNT);
    else if (progress < 2) setTargetCount(PROCESSING.PARTICLE_COUNT);
    else setTargetCount(AWAITING.PARTICLE_COUNT);
  }, [state]);

  // Animate currentCount toward targetCount smoothly over 3 seconds
  useEffect(() => {
    let raf;
    const DURATION = 7000; // 7 seconds
    const FPS = 60;
    const totalFrames = Math.round(DURATION / (1000 / FPS));
    let frame = 0;
    let startCount = currentCount;
    let endCount = targetCount;
    let diff = endCount - startCount;
    if (diff === 0) return;
    function animateCount() {
      frame++;
      const progress = Math.min(1, frame / totalFrames);
      const next = Math.round(startCount + diff * progress);
      setCurrentCount(next);
      if (progress < 1) {
        raf = requestAnimationFrame(animateCount);
      }
    }
    animateCount();
    return () => raf && cancelAnimationFrame(raf);
  }, [targetCount, currentCount]);

  // Animate transition progress for color blending
  useEffect(() => {
    let raf;
    const DURATION = 700; // ms for color transition
    const start = performance.now();
    const from = transitionProgress;
    const to = stateToProgress(state);
    function animate() {
      const now = performance.now();
      const t = Math.min(1, (now - start) / DURATION);
      setTransitionProgress(from + (to - from) * t);
      if (t < 1) raf = requestAnimationFrame(animate);
    }
    animate();
    return () => raf && cancelAnimationFrame(raf);
  }, [state]);

  useEffect(() => {
    // Interpolate parameters for three states
    const t = transitionProgress;
    const params = {
      ANGULAR_SPEED: lerp3(CALM.ANGULAR_SPEED, PROCESSING.ANGULAR_SPEED, AWAITING.ANGULAR_SPEED, t),
      SPIRAL_SPEED: lerp3(CALM.SPIRAL_SPEED, PROCESSING.SPIRAL_SPEED, AWAITING.SPIRAL_SPEED, t),
      OSC_AMP_MIN: lerp3(CALM.OSC_AMP_MIN, PROCESSING.OSC_AMP_MIN, AWAITING.OSC_AMP_MIN, t),
      OSC_AMP_MAX: lerp3(CALM.OSC_AMP_MAX, PROCESSING.OSC_AMP_MAX, AWAITING.OSC_AMP_MAX, t),
      SPARK_PROBABILITY: lerp3(CALM.SPARK_PROBABILITY, PROCESSING.SPARK_PROBABILITY, AWAITING.SPARK_PROBABILITY, t),
      SPARK_LIMIT: Math.round(lerp3(CALM.SPARK_LIMIT, PROCESSING.SPARK_LIMIT, AWAITING.SPARK_LIMIT, t)),
      RED_PARTICLE_RATIO: lerp3(CALM.RED_PARTICLE_RATIO, PROCESSING.RED_PARTICLE_RATIO, AWAITING.RED_PARTICLE_RATIO, t),
      RED_BRIGHTNESS: lerp3(CALM.RED_BRIGHTNESS, PROCESSING.RED_BRIGHTNESS, AWAITING.RED_BRIGHTNESS, t),
      BOND_COLOR: t < 1 ? CALM.BOND_COLOR : t < 2 ? PROCESSING.BOND_COLOR : AWAITING.BOND_COLOR,
      RED_BREATH_SPEED: [lerp3(CALM.RED_BREATH_SPEED[0], PROCESSING.RED_BREATH_SPEED[0], AWAITING.RED_BREATH_SPEED[0], t), lerp3(CALM.RED_BREATH_SPEED[1], PROCESSING.RED_BREATH_SPEED[1], AWAITING.RED_BREATH_SPEED[1], t)],
      RED_BREATH_AMP: lerp3(CALM.RED_BREATH_AMP, PROCESSING.RED_BREATH_AMP, AWAITING.RED_BREATH_AMP, t),
      VORTEX_RADIUS: lerp3(CALM.VORTEX_RADIUS, PROCESSING.VORTEX_RADIUS, AWAITING.VORTEX_RADIUS, t),
      RADIUS_WAVE_AMP: lerp3(CALM.RADIUS_WAVE_AMP, PROCESSING.RADIUS_WAVE_AMP, AWAITING.RADIUS_WAVE_AMP, t),
      RADIUS_WAVE_FREQ: lerp3(CALM.RADIUS_WAVE_FREQ, PROCESSING.RADIUS_WAVE_FREQ, AWAITING.RADIUS_WAVE_FREQ, t),
      RIM_THICKNESS_MIN: lerp3(CALM.RIM_THICKNESS_MIN, PROCESSING.RIM_THICKNESS_MIN, AWAITING.RIM_THICKNESS_MIN, t),
      RIM_THICKNESS_MAX: lerp3(CALM.RIM_THICKNESS_MAX, PROCESSING.RIM_THICKNESS_MAX, AWAITING.RIM_THICKNESS_MAX, t),
    };
    const centerX = width / 2;
    const centerY = height / 2;
    let oldParticles = particlesRef.current || [];
    let newParticles = oldParticles.slice(0, currentCount);
    if (currentCount > oldParticles.length) {
      newParticles = newParticles.concat(createParticles(centerX, centerY, params, currentCount - oldParticles.length, state === "processing"));
    }
    if (state !== "processing") {
      newParticles = newParticles.map((p) => ({ ...p, isElectric: false }));
    }
    particlesRef.current = newParticles;
    const ctx = canvasRef.current.getContext("2d");
    let running = true;

    function draw(time) {
      ctx.clearRect(0, 0, width, height);
      timeRef.current = time || 0;
      const now = performance.now();
      const particles = particlesRef.current;
      let sparksThisFrame = 0;
      // Draw bonds (lines) between close particles
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        const organic1 = Math.sin(timeRef.current * p1.oscSpeed + p1.phase) * p1.oscAmp;
        const animatedRadius = params.VORTEX_RADIUS + Math.sin(timeRef.current * params.RADIUS_WAVE_FREQ) * params.RADIUS_WAVE_AMP;
        const x1 = centerX + Math.cos(p1.angle) * (animatedRadius * (p1.radius / params.VORTEX_RADIUS) + organic1);
        const y1 = centerY + Math.sin(p1.angle) * (animatedRadius * (p1.radius / params.VORTEX_RADIUS) + organic1);
        for (let j = i + 1; j < Math.min(i + 8, particles.length); j++) {
          const p2 = particles[j];
          const organic2 = Math.sin(timeRef.current * p2.oscSpeed + p2.phase) * p2.oscAmp;
          const x2 = centerX + Math.cos(p2.angle) * (animatedRadius * (p2.radius / params.VORTEX_RADIUS) + organic2);
          const y2 = centerY + Math.sin(p2.angle) * (animatedRadius * (p2.radius / params.VORTEX_RADIUS) + organic2);
          const dx = x2 - x1;
          const dy = y2 - y1;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < BOND_DISTANCE) {
            ctx.save();
            ctx.strokeStyle = params.BOND_COLOR;
            ctx.lineWidth = 1;
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            ctx.restore();
            // Spark logic
            const bondKey = `${i}-${j}`;
            const lastSpark = bondSparkTimes.current.get(bondKey) || 0;
            if (sparksThisFrame < params.SPARK_LIMIT && Math.random() < params.SPARK_PROBABILITY && now - lastSpark > SPARK_COOLDOWN) {
              activeSparks.current.set(bondKey, { start: now });
              bondSparkTimes.current.set(bondKey, now);
              sparksThisFrame++;
            }
            // Animate spark if active
            const spark = activeSparks.current.get(bondKey);
            if (spark) {
              const elapsed = now - spark.start;
              if (elapsed < SPARK_FADE_DURATION) {
                let alpha = 1 - Math.abs((elapsed / SPARK_FADE_DURATION) * 2 - 1);
                alpha = Math.max(0, Math.min(1, alpha));
                ctx.save();
                ctx.strokeStyle = SPARK_COLOR;
                ctx.lineWidth = 1.1;
                ctx.shadowColor = SPARK_COLOR;
                ctx.shadowBlur = 4;
                ctx.globalAlpha = 0.45 * alpha;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
                ctx.restore();
              } else {
                activeSparks.current.delete(bondKey);
              }
            }
          }
        }
      }
      // Draw particles
      for (let p of particles) {
        // Calculate dynamic radius on every frame
        const currentMin = params.VORTEX_RADIUS * params.RIM_THICKNESS_MIN;
        const currentMax = params.VORTEX_RADIUS * params.RIM_THICKNESS_MAX;
        p.radius = currentMin + p.normRadius * (currentMax - currentMin);

        p.angle += p.speed;
        p.spiral = p.radius < params.VORTEX_RADIUS * 0.5 || p.radius > params.VORTEX_RADIUS * 1.2 ? -p.spiral : p.spiral;
        p.radius += p.spiral;

        const animatedRadius = params.VORTEX_RADIUS + Math.sin(timeRef.current * params.RADIUS_WAVE_FREQ) * params.RADIUS_WAVE_AMP;
        const organic = Math.sin(timeRef.current * p.oscSpeed + p.phase) * p.oscAmp;
        const x = centerX + Math.cos(p.angle) * (animatedRadius * (p.radius / params.VORTEX_RADIUS) + organic);
        const y = centerY + Math.sin(p.angle) * (animatedRadius * (p.radius / params.VORTEX_RADIUS) + organic);
        let color;
        let alpha = 0.7;
        if (p.isRed) {
          const breath = 0.5 + 0.5 * Math.sin(timeRef.current * p.redBreathSpeed + p.redPhase);
          alpha = 0.4 + params.RED_BREATH_AMP * breath;
          alpha = Math.max(0, Math.min(1, alpha));
          const r = Math.min(255, Math.round(230 * params.RED_BRIGHTNESS));
          const g = Math.min(30, Math.round(1 * params.RED_BRIGHTNESS));
          const b = Math.min(60, Math.round(0 * params.RED_BRIGHTNESS));
          color = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
        } else if (p.isElectric) {
          // Blend from white to electric red or gold based on transitionProgress
          if (transitionProgress < 1) {
            color = lerpColor(BASE_PARTICLE_COLOR_CALM, ELECTRIC_PARTICLE_COLOR, transitionProgress);
          } else if (transitionProgress < 2) {
            color = lerpColor(ELECTRIC_PARTICLE_COLOR, ELECTRIC_PARTICLE_COLOR_AWAITING, transitionProgress - 1);
          } else {
            color = ELECTRIC_PARTICLE_COLOR_AWAITING;
          }
        } else {
          // Blend from calm to processing to awaiting
          if (transitionProgress < 1) {
            color = lerpColor(BASE_PARTICLE_COLOR_CALM, BASE_PARTICLE_COLOR_PROCESSING, transitionProgress);
          } else if (transitionProgress < 2) {
            color = lerpColor(BASE_PARTICLE_COLOR_PROCESSING, BASE_PARTICLE_COLOR_AWAITING, transitionProgress - 1);
          } else {
            color = BASE_PARTICLE_COLOR_AWAITING;
          }
        }
        ctx.beginPath();
        ctx.arc(x, y, PARTICLE_SIZE, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }
    }

    function animate(time) {
      if (!running) return;
      draw(time);
      animationRef.current = requestAnimationFrame(animate);
    }
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      cancelAnimationFrame(animationRef.current);
    };
  }, [width, height, state, currentCount]);

  return <canvas ref={canvasRef} width={width} height={height} style={{ display: "block", margin: "0 auto", background: "white", borderRadius: "50%" }} aria-label="Vortex animation" />;
};

export default VortexAnimation;
