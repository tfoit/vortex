import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

const VortexAnimation = ({ size = 200, particleCount = 12, className = "", isActive = false, onUploadZone = false }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const centerX = size / 2;
    const centerY = size / 2;

    // UBS brand colors
    const colors = ["#000000", "#E60100", "#333333", "#FF4444"];

    // Initialize particles
    particlesRef.current = Array.from({ length: particleCount }, (_, i) => ({
      angle: (i / particleCount) * Math.PI * 2,
      radius: Math.random() * (size / 3) + 20,
      speed: Math.random() * 0.02 + 0.01,
      size: Math.random() * 3 + 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: Math.random() * 0.8 + 0.2,
      pulsePhase: Math.random() * Math.PI * 2,
      originalRadius: 0,
    }));

    particlesRef.current.forEach((particle) => {
      particle.originalRadius = particle.radius;
    });

    const animate = () => {
      ctx.clearRect(0, 0, size, size);

      // Draw vortex center with UBS red
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 30);
      gradient.addColorStop(0, isActive ? "#E60100" : "#000000");
      gradient.addColorStop(0.5, isActive ? "rgba(230, 1, 0, 0.5)" : "rgba(0, 0, 0, 0.5)");
      gradient.addColorStop(1, "transparent");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
      ctx.fill();

      // Draw swirling particles
      particlesRef.current.forEach((particle, index) => {
        // Update particle position
        particle.angle += particle.speed * (isActive ? 2 : 1);

        // Pulsing effect
        const pulse = Math.sin(Date.now() * 0.003 + particle.pulsePhase) * 0.3;
        particle.radius = particle.originalRadius + pulse * 10;

        // Calculate position
        const x = centerX + Math.cos(particle.angle) * particle.radius;
        const y = centerY + Math.sin(particle.angle) * particle.radius;

        // Draw particle with glow effect
        ctx.save();
        ctx.globalAlpha = particle.opacity * (isActive ? 1.5 : 1);

        // Glow effect
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = isActive ? 15 : 8;

        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(x, y, particle.size * (isActive ? 1.5 : 1), 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Draw connecting lines for vortex effect
        if (index > 0) {
          const prevParticle = particlesRef.current[index - 1];
          const prevX = centerX + Math.cos(prevParticle.angle) * prevParticle.radius;
          const prevY = centerY + Math.sin(prevParticle.angle) * prevParticle.radius;

          ctx.save();
          ctx.globalAlpha = 0.1 * (isActive ? 2 : 1);
          ctx.strokeStyle = particle.color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(prevX, prevY);
          ctx.lineTo(x, y);
          ctx.stroke();
          ctx.restore();
        }
      });

      // Upload zone indicator
      if (onUploadZone && isActive) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = "#E60100";
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        ctx.lineDashOffset = Date.now() * 0.01;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size / 2 - 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [size, particleCount, isActive, onUploadZone]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`${className} ${isActive ? "scale-110" : ""} transition-transform duration-300`}
      style={{
        filter: isActive ? "brightness(1.2)" : "brightness(1)",
        transition: "filter 0.3s ease",
      }}
    />
  );
};

export default VortexAnimation;
