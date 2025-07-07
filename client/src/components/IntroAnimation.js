import React, { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";

// Animation phases
const PHASES = {
  LOGO: "logo",
  PARTICLES_EMERGE: "particles_emerge",
  FORM_VORTEX: "form_vortex",
  TRANSITION_TO_CALM: "transition_to_calm",
  COMPLETE: "complete",
};

// Animation parameters
const INTRO_CONFIG = {
  LOGO_SCALE_DURATION: 2000,
  PARTICLES_EMERGE_DURATION: 2500,
  VORTEX_FORM_DURATION: 3000,
  CALM_TRANSITION_DURATION: 2000,
  PARTICLE_COUNT: 150,
  LOGO_PULSE_SPEED: 0.002,
  VORTEX_RADIUS: 160,
  PARTICLE_SIZE: 2,
  UBS_RED: "#E60000",
  UBS_GRAY: "#767676",
  GOLD_ACCENT: "#FFD700",
};

// VortexAnimation CALM state parameters for smooth transition
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
};

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function createParticle(centerX, centerY, isFromLogo = true) {
  return {
    id: Math.random(),
    x: centerX + randomBetween(-20, 20),
    y: centerY + randomBetween(-20, 20),
    targetX: 0,
    targetY: 0,
    angle: randomBetween(0, Math.PI * 2),
    radius: randomBetween(80, 200),
    speed: randomBetween(0.005, 0.015),
    size: randomBetween(1.5, 3),
    opacity: isFromLogo ? 0 : 0.7,
    color: Math.random() < 0.3 ? INTRO_CONFIG.UBS_RED : INTRO_CONFIG.UBS_GRAY,
    pulse: randomBetween(0, Math.PI * 2),
    pulseSpeed: randomBetween(0.01, 0.03),
    isFromLogo,
    // Add calm state properties for smooth transition
    normRadius: Math.random(),
    oscSpeed: randomBetween(0.0007, 0.0015),
    oscAmp: randomBetween(2, 7),
    isRed: Math.random() < CALM_STATE.RED_PARTICLE_RATIO,
    redPhase: randomBetween(0, Math.PI * 2),
    redBreathSpeed: randomBetween(0.0007, 0.0012),
  };
}

const IntroAnimation = ({ onComplete, width = 400, height = 400 }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef();
  const particlesRef = useRef([]);
  const startTimeRef = useRef(null);

  const [phase, setPhase] = useState(PHASES.LOGO);
  const [logoScale, setLogoScale] = useState(1);
  const [logoOpacity, setLogoOpacity] = useState(1);

  console.log("IntroAnimation mounted with dimensions:", width, "x", height);

  // Create initial particles
  useEffect(() => {
    console.log("Creating initial particles...");
    const centerX = width / 2;
    const centerY = height / 2;

    particlesRef.current = Array.from({ length: INTRO_CONFIG.PARTICLE_COUNT }, () => createParticle(centerX, centerY, true));
    console.log("Created", particlesRef.current.length, "particles");
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
      if (elapsed < INTRO_CONFIG.LOGO_SCALE_DURATION) {
        if (phase !== PHASES.LOGO) {
          console.log("Phase: LOGO");
          setPhase(PHASES.LOGO);
        }
        // Logo grows and pulses
        const progress = elapsed / INTRO_CONFIG.LOGO_SCALE_DURATION;
        setLogoScale(1 + Math.sin(progress * Math.PI) * 0.1);
      } else if (elapsed < INTRO_CONFIG.LOGO_SCALE_DURATION + INTRO_CONFIG.PARTICLES_EMERGE_DURATION) {
        if (phase !== PHASES.PARTICLES_EMERGE) {
          console.log("Phase: PARTICLES_EMERGE");
          setPhase(PHASES.PARTICLES_EMERGE);
        }
        // Logo fades as particles emerge
        const fadeProgress = (elapsed - INTRO_CONFIG.LOGO_SCALE_DURATION) / INTRO_CONFIG.PARTICLES_EMERGE_DURATION;
        setLogoOpacity(1 - fadeProgress * 0.8);
      } else if (elapsed < INTRO_CONFIG.LOGO_SCALE_DURATION + INTRO_CONFIG.PARTICLES_EMERGE_DURATION + INTRO_CONFIG.VORTEX_FORM_DURATION) {
        if (phase !== PHASES.FORM_VORTEX) {
          console.log("Phase: FORM_VORTEX");
          setPhase(PHASES.FORM_VORTEX);
        }
        setLogoOpacity(0.2);
      } else if (elapsed < INTRO_CONFIG.LOGO_SCALE_DURATION + INTRO_CONFIG.PARTICLES_EMERGE_DURATION + INTRO_CONFIG.VORTEX_FORM_DURATION + INTRO_CONFIG.CALM_TRANSITION_DURATION) {
        if (phase !== PHASES.TRANSITION_TO_CALM) {
          console.log("Phase: TRANSITION_TO_CALM");
          setPhase(PHASES.TRANSITION_TO_CALM);
        }
        setLogoOpacity(0.1);
      } else {
        if (phase !== PHASES.COMPLETE) {
          console.log("Phase: COMPLETE - calling onComplete");
          setPhase(PHASES.COMPLETE);
          setTimeout(() => onComplete && onComplete(), 500);
        }
      }
    }

    function updateParticles(elapsed) {
      const particles = particlesRef.current;

      particles.forEach((particle, index) => {
        // Update pulse for breathing effect
        particle.pulse += particle.pulseSpeed;

        if (phase === PHASES.PARTICLES_EMERGE) {
          // Particles emerge from logo and start moving outward
          const emergeProgress = Math.min(1, (elapsed - INTRO_CONFIG.LOGO_SCALE_DURATION) / INTRO_CONFIG.PARTICLES_EMERGE_DURATION);
          particle.opacity = emergeProgress * 0.8;

          // Move particles outward from center
          const angle = (index / particles.length) * Math.PI * 2 + elapsed * 0.001;
          const radius = emergeProgress * 100;
          particle.x = centerX + Math.cos(angle) * radius + Math.sin(particle.pulse) * 10;
          particle.y = centerY + Math.sin(angle) * radius + Math.cos(particle.pulse) * 10;
        } else if (phase === PHASES.FORM_VORTEX) {
          // Particles form into vortex
          const vortexProgress = Math.min(1, (elapsed - INTRO_CONFIG.LOGO_SCALE_DURATION - INTRO_CONFIG.PARTICLES_EMERGE_DURATION) / INTRO_CONFIG.VORTEX_FORM_DURATION);

          // Calculate target vortex position
          particle.angle += particle.speed;
          const targetRadius = INTRO_CONFIG.VORTEX_RADIUS * (0.6 + 0.4 * Math.sin(particle.pulse));
          const targetX = centerX + Math.cos(particle.angle) * targetRadius;
          const targetY = centerY + Math.sin(particle.angle) * targetRadius;

          // Smoothly move to vortex position
          particle.x = lerp(particle.x, targetX, vortexProgress * 0.1);
          particle.y = lerp(particle.y, targetY, vortexProgress * 0.1);

          particle.opacity = 0.8 + Math.sin(particle.pulse) * 0.2;
        } else if (phase === PHASES.TRANSITION_TO_CALM) {
          // Transition to calm state parameters
          const transitionStart = INTRO_CONFIG.LOGO_SCALE_DURATION + INTRO_CONFIG.PARTICLES_EMERGE_DURATION + INTRO_CONFIG.VORTEX_FORM_DURATION;
          const transitionProgress = Math.min(1, (elapsed - transitionStart) / INTRO_CONFIG.CALM_TRANSITION_DURATION);

          // Gradually adjust to calm state physics
          const calmSpeed = CALM_STATE.ANGULAR_SPEED * (0.7 + 0.6 * Math.random());
          particle.speed = lerp(particle.speed, calmSpeed, transitionProgress * 0.1);

          // Calculate position using calm state physics
          particle.angle += particle.speed;
          const organic = Math.sin(elapsed * particle.oscSpeed + particle.pulse) * particle.oscAmp * (1 + transitionProgress);
          const radius = CALM_STATE.VORTEX_RADIUS * (0.5 + 0.5 * particle.normRadius);

          particle.x = centerX + Math.cos(particle.angle) * radius + organic;
          particle.y = centerY + Math.sin(particle.angle) * radius + organic;

          // Transition particle colors to calm state
          if (particle.isRed) {
            const breath = 0.5 + 0.5 * Math.sin(elapsed * particle.redBreathSpeed + particle.redPhase);
            particle.opacity = 0.4 + 0.6 * breath * transitionProgress;
            particle.color = `rgba(230, 1, 0, ${particle.opacity})`;
          } else {
            particle.opacity = lerp(0.8, 0.7, transitionProgress);
            // Gradually transition to calm gray color
            const currentColor = transitionProgress < 0.5 ? INTRO_CONFIG.UBS_GRAY : CALM_STATE.BASE_PARTICLE_COLOR;
            particle.color = currentColor;
          }
        } else if (phase === PHASES.COMPLETE) {
          // Final calm state matching VortexAnimation
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
          ctx.shadowBlur = phase === PHASES.FORM_VORTEX || phase === PHASES.TRANSITION_TO_CALM || phase === PHASES.COMPLETE ? 8 : 4;

          // Adjust particle size based on phase
          let size = particle.size;
          if (phase === PHASES.TRANSITION_TO_CALM || phase === PHASES.COMPLETE) {
            size = CALM_STATE.PARTICLE_SIZE * (1 + Math.sin(particle.pulse) * 0.2);
          } else {
            size = particle.size * (1 + Math.sin(particle.pulse) * 0.3);
          }

          ctx.beginPath();
          ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      // Draw connections between nearby particles in vortex and transition phases
      if (phase === PHASES.FORM_VORTEX || phase === PHASES.TRANSITION_TO_CALM || phase === PHASES.COMPLETE) {
        ctx.save();

        // Use calm state bond color during transition
        const bondColor = phase === PHASES.TRANSITION_TO_CALM || phase === PHASES.COMPLETE ? CALM_STATE.BOND_COLOR : `rgba(230, 0, 0, 0.2)`;

        ctx.strokeStyle = bondColor;
        ctx.lineWidth = 1;

        for (let i = 0; i < particlesRef.current.length; i++) {
          const p1 = particlesRef.current[i];
          for (let j = i + 1; j < Math.min(i + 8, particlesRef.current.length); j++) {
            const p2 = particlesRef.current[j];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Use calm state bond distance during transition
            const bondDistance = phase === PHASES.TRANSITION_TO_CALM || phase === PHASES.COMPLETE ? 15 : 60;

            if (dist < bondDistance) {
              ctx.globalAlpha = (1 - dist / bondDistance) * 0.3;
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
      {/* UBS Logo */}
      <motion.div
        className="absolute z-10"
        style={{
          scale: logoScale,
          opacity: logoOpacity,
        }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: logoScale, opacity: logoOpacity }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center space-x-4">
          {/* UBS Logo Image */}
          <div className="relative">
            <img
              src="http://localhost:7770/ubs-logo.png"
              alt="UBS Logo"
              className="h-16 w-auto object-contain"
              style={{
                filter: "drop-shadow(0 4px 8px rgba(230, 0, 0, 0.3))",
              }}
            />

            {/* Pulsing glow effect */}
            <motion.div
              className="absolute inset-0 bg-red-600 rounded opacity-10 blur-lg"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.1, 0.3, 0.1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>

          {/* UBS Text */}
          <motion.div
            className="text-3xl font-light text-gray-800"
            animate={{
              opacity: [1, 0.7, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            Vortex AI Agent
          </motion.div>
        </div>
      </motion.div>

      {/* Particle Canvas */}
      <canvas ref={canvasRef} width={width} height={height} className="absolute inset-0" style={{ zIndex: 5 }} />

      {/* Background gradient that appears during vortex formation */}
      <motion.div
        className="absolute inset-0 bg-gradient-radial from-red-50 via-transparent to-transparent"
        style={{
          opacity: phase === PHASES.FORM_VORTEX || phase === PHASES.COMPLETE ? 0.3 : 0,
        }}
        transition={{ duration: 1 }}
      />
    </div>
  );
};

export default IntroAnimation;
