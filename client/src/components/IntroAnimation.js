import React, { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";

// Animation phases
const PHASES = {
  LOGO: "logo",
  PARTICLES_EMERGE: "particles_emerge",
  FORM_VORTEX: "form_vortex",
  COMPLETE: "complete",
};

// Animation parameters
const INTRO_CONFIG = {
  LOGO_SCALE_DURATION: 2000,
  PARTICLES_EMERGE_DURATION: 3000,
  VORTEX_FORM_DURATION: 4000,
  PARTICLE_COUNT: 150,
  LOGO_PULSE_SPEED: 0.002,
  VORTEX_RADIUS: 160,
  PARTICLE_SIZE: 2,
  UBS_RED: "#E60000",
  UBS_GRAY: "#767676",
  GOLD_ACCENT: "#FFD700",
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
    size: randomBetween(1, 3),
    opacity: isFromLogo ? 0 : 0.7,
    color: Math.random() < 0.3 ? INTRO_CONFIG.UBS_RED : INTRO_CONFIG.UBS_GRAY,
    pulse: randomBetween(0, Math.PI * 2),
    pulseSpeed: randomBetween(0.01, 0.03),
    isFromLogo,
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
        } else if (phase === PHASES.COMPLETE) {
          // Final vortex state with full animation
          particle.angle += particle.speed * 2;
          const radius = INTRO_CONFIG.VORTEX_RADIUS * (0.7 + 0.3 * Math.sin(particle.pulse));
          particle.x = centerX + Math.cos(particle.angle) * radius;
          particle.y = centerY + Math.sin(particle.angle) * radius;
          particle.opacity = 0.9;
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
          ctx.shadowBlur = phase === PHASES.FORM_VORTEX || phase === PHASES.COMPLETE ? 8 : 4;

          const size = particle.size * (1 + Math.sin(particle.pulse) * 0.3);
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      // Draw connections between nearby particles in vortex phase
      if (phase === PHASES.FORM_VORTEX || phase === PHASES.COMPLETE) {
        ctx.save();
        ctx.strokeStyle = `rgba(230, 0, 0, 0.2)`;
        ctx.lineWidth = 1;

        for (let i = 0; i < particlesRef.current.length; i++) {
          const p1 = particlesRef.current[i];
          for (let j = i + 1; j < Math.min(i + 5, particlesRef.current.length); j++) {
            const p2 = particlesRef.current[j];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 60) {
              ctx.globalAlpha = (1 - dist / 60) * 0.3;
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
