import React, { useRef, useEffect, useState } from "react";

// Animation phases
const PHASES = {
  PARTICLES_SPAWN: "particles_spawn",
  FORM_VORTEX: "form_vortex",
  CALM_STATE: "calm_state",
  COMPLETE: "complete",
};

// Animation parameters
const INTRO_CONFIG = {
  PARTICLES_SPAWN_DURATION: 3000, // 3 seconds to spawn all particles
  FORM_VORTEX_DURATION: 3000,
  CALM_STATE_DURATION: 2000,
  PARTICLE_COUNT: 1700, // Match VortexAnimation CALM state
  SPAWN_RATE: 0.6, // Particles spawn exponentially faster
  UBS_RED: "#E60000",
  UBS_GRAY: "#767676",
};

// VortexAnimation CALM state parameters for exact matching
const CALM_STATE = {
  ANGULAR_SPEED: 0.0005,
  SPIRAL_SPEED: 0.008,
  OSC_AMP_MIN: 2,
  OSC_AMP_MAX: 7,
  RED_PARTICLE_RATIO: 0.3,
  BOND_COLOR: "rgba(80,80,80,0.18)",
  BASE_PARTICLE_COLOR: "#B3B3B3",
  VORTEX_RADIUS: 180,
  PARTICLE_SIZE: 1.5,
  BOND_DISTANCE: 15,
};

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function createParticle(width, height, centerX, centerY, spawnTime) {
  return {
    id: Math.random(),
    // Spawn across entire page area
    x: randomBetween(0, width),
    y: randomBetween(0, height),
    targetX: 0,
    targetY: 0,
    angle: randomBetween(0, Math.PI * 2),
    radius: randomBetween(80, 200),
    speed: randomBetween(0.005, 0.015),
    size: randomBetween(1.5, 3),
    opacity: 0,
    spawnTime: spawnTime,
    fadeInDuration: randomBetween(800, 1200), // Time to fade in
    color: Math.random() < 0.3 ? INTRO_CONFIG.UBS_RED : INTRO_CONFIG.UBS_GRAY,
    pulse: randomBetween(0, Math.PI * 2),
    pulseSpeed: randomBetween(0.01, 0.03),
    // Calm state properties for smooth transition
    normRadius: Math.random(),
    oscSpeed: randomBetween(0.0007, 0.0015),
    oscAmp: randomBetween(2, 7),
    isRed: Math.random() < CALM_STATE.RED_PARTICLE_RATIO,
    redPhase: randomBetween(0, Math.PI * 2),
    redBreathSpeed: randomBetween(0.0007, 0.0012),
    // Initial drift for scattered particles
    driftX: randomBetween(-0.5, 0.5),
    driftY: randomBetween(-0.5, 0.5),
  };
}

const IntroAnimation = ({ onComplete, width = 400, height = 400 }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef();
  const particlesRef = useRef([]);
  const startTimeRef = useRef(null);
  const spawnedCountRef = useRef(0);

  const [phase, setPhase] = useState(PHASES.PARTICLES_SPAWN);

  console.log("IntroAnimation mounted with dimensions:", width, "x", height);

  // Initialize empty particles array
  useEffect(() => {
    console.log("Initializing particles array...");
    particlesRef.current = [];
    spawnedCountRef.current = 0;
  }, [width, height]);

  useEffect(() => {
    if (!startTimeRef.current) {
      startTimeRef.current = performance.now();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const centerX = width / 2;
    const centerY = height / 2;
    let isAnimating = true;

    function updatePhase(elapsed) {
      if (elapsed < INTRO_CONFIG.PARTICLES_SPAWN_DURATION) {
        if (phase !== PHASES.PARTICLES_SPAWN) {
          console.log("Phase: PARTICLES_SPAWN");
          setPhase(PHASES.PARTICLES_SPAWN);
        }
      } else if (elapsed < INTRO_CONFIG.PARTICLES_SPAWN_DURATION + INTRO_CONFIG.FORM_VORTEX_DURATION) {
        if (phase !== PHASES.FORM_VORTEX) {
          console.log("Phase: FORM_VORTEX");
          setPhase(PHASES.FORM_VORTEX);
        }
      } else if (elapsed < INTRO_CONFIG.PARTICLES_SPAWN_DURATION + INTRO_CONFIG.FORM_VORTEX_DURATION + INTRO_CONFIG.CALM_STATE_DURATION) {
        if (phase !== PHASES.CALM_STATE) {
          console.log("Phase: CALM_STATE");
          setPhase(PHASES.CALM_STATE);
        }
      } else {
        if (phase !== PHASES.COMPLETE) {
          console.log("Phase: COMPLETE - calling onComplete");
          setPhase(PHASES.COMPLETE);
          setTimeout(() => onComplete && onComplete(), 500);
        }
      }
    }

    function spawnParticles(elapsed) {
      if (phase !== PHASES.PARTICLES_SPAWN) return;

      // Exponential spawn rate - more particles spawn as time progresses
      const spawnProgress = Math.min(1, elapsed / INTRO_CONFIG.PARTICLES_SPAWN_DURATION);
      const targetCount = Math.floor(INTRO_CONFIG.PARTICLE_COUNT * Math.pow(spawnProgress, INTRO_CONFIG.SPAWN_RATE));

      // Spawn new particles if we haven't reached the target
      while (spawnedCountRef.current < targetCount && spawnedCountRef.current < INTRO_CONFIG.PARTICLE_COUNT) {
        const newParticle = createParticle(width, height, centerX, centerY, elapsed);
        particlesRef.current.push(newParticle);
        spawnedCountRef.current++;
      }
    }

    function updateParticles(elapsed) {
      const particles = particlesRef.current;

      particles.forEach((particle, index) => {
        // Update pulse for breathing effect
        particle.pulse += particle.pulseSpeed;

        if (phase === PHASES.PARTICLES_SPAWN) {
          // Particles fade in and drift slightly
          const timeSinceSpawn = elapsed - particle.spawnTime;
          const fadeProgress = Math.min(1, timeSinceSpawn / particle.fadeInDuration);
          particle.opacity = fadeProgress * 0.6;

          // Add slight drift movement
          particle.x += particle.driftX;
          particle.y += particle.driftY;

          // Keep particles within bounds
          if (particle.x < 0 || particle.x > width) particle.driftX *= -0.8;
          if (particle.y < 0 || particle.y > height) particle.driftY *= -0.8;
        } else if (phase === PHASES.FORM_VORTEX) {
          // Particles move toward vortex formation
          const vortexProgress = Math.min(1, (elapsed - INTRO_CONFIG.PARTICLES_SPAWN_DURATION) / INTRO_CONFIG.FORM_VORTEX_DURATION);

          // Calculate target vortex position
          particle.angle += particle.speed;
          const targetRadius = CALM_STATE.VORTEX_RADIUS * (0.5 + 0.5 * particle.normRadius);
          const targetX = centerX + Math.cos(particle.angle) * targetRadius;
          const targetY = centerY + Math.sin(particle.angle) * targetRadius;

          // Smoothly move to vortex position
          particle.x = lerp(particle.x, targetX, vortexProgress * 0.06);
          particle.y = lerp(particle.y, targetY, vortexProgress * 0.06);

          particle.opacity = 0.7 + Math.sin(particle.pulse) * 0.1;
        } else if (phase === PHASES.CALM_STATE || phase === PHASES.COMPLETE) {
          // Full calm state matching VortexAnimation
          particle.angle += CALM_STATE.ANGULAR_SPEED * (0.7 + 0.6 * Math.random());

          // Apply calm state organic movement
          const organic = Math.sin(elapsed * particle.oscSpeed + particle.pulse) * particle.oscAmp;
          const radius = CALM_STATE.VORTEX_RADIUS * (0.5 + 0.5 * particle.normRadius);

          particle.x = centerX + Math.cos(particle.angle) * radius + organic;
          particle.y = centerY + Math.sin(particle.angle) * radius + organic;

          // Apply calm state colors and breathing
          if (particle.isRed) {
            const breath = 0.5 + 0.5 * Math.sin(elapsed * particle.redBreathSpeed + particle.redPhase);
            particle.opacity = 0.4 + 0.6 * breath;
            particle.color = `rgba(230, 1, 0, ${particle.opacity})`;
          } else {
            particle.opacity = 0.7;
            particle.color = CALM_STATE.BASE_PARTICLE_COLOR;
          }
        }
      });
    }

    function draw(timestamp) {
      if (!isAnimating) return;

      const elapsed = timestamp - startTimeRef.current;
      updatePhase(elapsed);
      spawnParticles(elapsed);
      updateParticles(elapsed);

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Draw particles
      particlesRef.current.forEach((particle) => {
        if (particle.opacity > 0) {
          ctx.save();
          ctx.globalAlpha = particle.opacity;
          ctx.fillStyle = particle.color;
          ctx.shadowColor = particle.color;

          // Adjust shadow based on phase
          if (phase === PHASES.PARTICLES_SPAWN) {
            ctx.shadowBlur = 2;
          } else {
            ctx.shadowBlur = 6;
          }

          // Adjust particle size based on phase
          let size = CALM_STATE.PARTICLE_SIZE * (1 + Math.sin(particle.pulse) * 0.2);
          if (phase === PHASES.PARTICLES_SPAWN) {
            size *= 0.8; // Slightly smaller during spawn
          }

          ctx.beginPath();
          ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      // Draw connections between nearby particles (only during vortex phases)
      if (phase === PHASES.FORM_VORTEX || phase === PHASES.CALM_STATE || phase === PHASES.COMPLETE) {
        ctx.save();
        ctx.strokeStyle = CALM_STATE.BOND_COLOR;
        ctx.lineWidth = 1;

        for (let i = 0; i < particlesRef.current.length; i++) {
          const p1 = particlesRef.current[i];
          for (let j = i + 1; j < Math.min(i + 8, particlesRef.current.length); j++) {
            const p2 = particlesRef.current[j];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < CALM_STATE.BOND_DISTANCE) {
              ctx.globalAlpha = (1 - dist / CALM_STATE.BOND_DISTANCE) * 0.3;
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
        }
        ctx.restore();
      }

      animationRef.current = requestAnimationFrame(draw);
    }

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      isAnimating = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [phase, width, height, onComplete]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-white">
      {/* Particle Canvas */}
      <canvas ref={canvasRef} width={width} height={height} className="absolute inset-0" />

      {/* Subtle background gradient during vortex formation */}
      <div
        className="absolute inset-0 bg-gradient-radial from-gray-50 via-transparent to-transparent"
        style={{
          opacity: phase === PHASES.FORM_VORTEX || phase === PHASES.CALM_STATE || phase === PHASES.COMPLETE ? 0.2 : 0,
        }}
      />
    </div>
  );
};

export default IntroAnimation;
