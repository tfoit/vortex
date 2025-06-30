import React, { useRef, useEffect, useState } from "react";

// Animation parameters for calm and processing states
const CALM = {
  ANGULAR_SPEED: 0.0012,
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
  PARTICLE_COUNT: 1050,
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
  RED_BREATH_AMP: 1.0,
  PARTICLE_COUNT: 2500,
};
const PARTICLE_SIZE = 2;
const VORTEX_RADIUS = 90;
const RED_PARTICLE_RATIO = 0.3;
const BOND_DISTANCE = 32;
const SPARK_COOLDOWN = 300000;
const SPARK_FADE_DURATION = 700;
const SPARK_COLOR = "#E60000";
const PARTICLE_COLOR = "#9EA0A1";
const BASE_PARTICLE_COLOR_CALM = "#D0D0D0";
const BASE_PARTICLE_COLOR_PROCESSING = "#000000";
const ELECTRIC_PARTICLE_COLOR = "#E60000";
const ELECTRIC_PARTICLE_RATIO = 0.4; // 40% become electric in processing

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
      radius: randomBetween(VORTEX_RADIUS * 0.5, VORTEX_RADIUS * 1.2),
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
 * @param {boolean} processing - If true, animation becomes subtly more dynamic to indicate processing.
 */
const VortexAnimation = ({ width = 320, height = 320, processing = false }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef();
  const particlesRef = useRef();
  const timeRef = useRef(0);
  const bondSparkTimes = useRef(new Map());
  const activeSparks = useRef(new Map());
  // Smooth particle count state
  const [targetCount, setTargetCount] = useState(CALM.PARTICLE_COUNT);
  const [currentCount, setCurrentCount] = useState(CALM.PARTICLE_COUNT);
  const [transitionProgress, setTransitionProgress] = useState(processing ? 1 : 0); // 0: calm, 1: processing

  // Helper to interpolate between calm and processing values
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // Smoothly update target particle count on processing change
  useEffect(() => {
    setTargetCount(processing ? PROCESSING.PARTICLE_COUNT : CALM.PARTICLE_COUNT);
  }, [processing]);

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
    const to = processing ? 1 : 0;
    function animate() {
      const now = performance.now();
      const t = Math.min(1, (now - start) / DURATION);
      setTransitionProgress(from + (to - from) * t);
      if (t < 1) raf = requestAnimationFrame(animate);
    }
    animate();
    return () => raf && cancelAnimationFrame(raf);
  }, [processing]);

  useEffect(() => {
    // Interpolate parameters for subtle transition
    const t = processing ? 1 : 0;
    const params = {
      ANGULAR_SPEED: lerp(CALM.ANGULAR_SPEED, PROCESSING.ANGULAR_SPEED, t),
      SPIRAL_SPEED: lerp(CALM.SPIRAL_SPEED, PROCESSING.SPIRAL_SPEED, t),
      OSC_AMP_MIN: lerp(CALM.OSC_AMP_MIN, PROCESSING.OSC_AMP_MIN, t),
      OSC_AMP_MAX: lerp(CALM.OSC_AMP_MAX, PROCESSING.OSC_AMP_MAX, t),
      SPARK_PROBABILITY: lerp(CALM.SPARK_PROBABILITY, PROCESSING.SPARK_PROBABILITY, t),
      SPARK_LIMIT: Math.round(lerp(CALM.SPARK_LIMIT, PROCESSING.SPARK_LIMIT, t)),
      RED_PARTICLE_RATIO: lerp(CALM.RED_PARTICLE_RATIO, PROCESSING.RED_PARTICLE_RATIO, t),
      RED_BRIGHTNESS: lerp(CALM.RED_BRIGHTNESS, PROCESSING.RED_BRIGHTNESS, t),
      BOND_COLOR: t > 0.5 ? PROCESSING.BOND_COLOR : CALM.BOND_COLOR,
      RED_BREATH_SPEED: [lerp(CALM.RED_BREATH_SPEED[0], PROCESSING.RED_BREATH_SPEED[0], t), lerp(CALM.RED_BREATH_SPEED[1], PROCESSING.RED_BREATH_SPEED[1], t)],
      RED_BREATH_AMP: lerp(CALM.RED_BREATH_AMP, PROCESSING.RED_BREATH_AMP, t),
    };
    const centerX = width / 2;
    const centerY = height / 2;
    // If particle count changes, preserve as many as possible
    let oldParticles = particlesRef.current || [];
    let newParticles = oldParticles.slice(0, currentCount);
    if (currentCount > oldParticles.length) {
      // Add new particles
      newParticles = newParticles.concat(createParticles(centerX, centerY, params, currentCount - oldParticles.length, processing));
    }
    // If transitioning from processing to calm, remove isElectric
    if (!processing) {
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
        const x1 = centerX + Math.cos(p1.angle) * (p1.radius + organic1);
        const y1 = centerY + Math.sin(p1.angle) * (p1.radius + organic1);
        for (let j = i + 1; j < Math.min(i + 8, particles.length); j++) {
          const p2 = particles[j];
          const organic2 = Math.sin(timeRef.current * p2.oscSpeed + p2.phase) * p2.oscAmp;
          const x2 = centerX + Math.cos(p2.angle) * (p2.radius + organic2);
          const y2 = centerY + Math.sin(p2.angle) * (p2.radius + organic2);
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
        p.angle += p.speed;
        p.radius += p.spiral;
        if (p.radius < VORTEX_RADIUS * 0.5 || p.radius > VORTEX_RADIUS * 1.2) {
          p.spiral *= -1;
        }
        const organic = Math.sin(timeRef.current * p.oscSpeed + p.phase) * p.oscAmp;
        const x = centerX + Math.cos(p.angle) * (p.radius + organic);
        const y = centerY + Math.sin(p.angle) * (p.radius + organic);
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
          // Blend from white to electric red based on transitionProgress
          color = lerpColor(BASE_PARTICLE_COLOR_CALM, ELECTRIC_PARTICLE_COLOR, transitionProgress);
        } else {
          // Blend from white to black based on transitionProgress
          color = lerpColor(BASE_PARTICLE_COLOR_CALM, BASE_PARTICLE_COLOR_PROCESSING, transitionProgress);
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
  }, [width, height, processing, currentCount]);

  return <canvas ref={canvasRef} width={width} height={height} style={{ display: "block", margin: "0 auto", background: "white", borderRadius: "50%" }} aria-label="Vortex animation" />;
};

export default VortexAnimation;
