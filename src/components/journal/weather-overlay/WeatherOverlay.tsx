import React, { useEffect, useRef, useMemo } from 'react';
import { WeatherCategory, TimeOfDay } from './types';

interface WeatherOverlayProps {
  category: WeatherCategory;
  timeOfDay: TimeOfDay;
  isVisible: boolean;
  opacity: number;
  phase: 'idle' | 'fading-in' | 'playing' | 'fading-out';
}

// Particle configuration based on weather
const PARTICLE_CONFIG = {
  rain: { count: 80, speed: 12, size: 2 },
  snow: { count: 100, speed: 1.5, size: 3 }, // Increased count, adjusted speed/size
  fog: { count: 5, speed: 0.15, size: 300 }, // Fewer, larger cloud layers
  clear: { count: 0, speed: 0, size: 0 },
};

// Subtle background tints (very muted, low opacity)
const BACKGROUND_TINTS = {
  rain: {
    day: 'rgba(180, 190, 200, 0.08)',
    night: 'rgba(40, 50, 70, 0.12)',
    twilight: 'rgba(150, 140, 160, 0.08)',
  },
  snow: {
    day: 'rgba(220, 225, 235, 0.1)',
    night: 'rgba(60, 70, 90, 0.1)',
    twilight: 'rgba(200, 190, 210, 0.08)',
  },
  fog: {
    day: 'rgba(200, 200, 210, 0.12)',
    night: 'rgba(80, 85, 100, 0.1)',
    twilight: 'rgba(180, 170, 190, 0.1)',
  },
  clear: {
    day: 'rgba(255, 250, 230, 0.05)',
    night: 'rgba(20, 30, 50, 0.08)',
    twilight: 'rgba(255, 200, 150, 0.06)',
  },
};

interface Particle {
  id: number;
  x: number;
  y: number;
  speed: number;
  opacity: number;
  size: number;
  drift?: number;
  layer?: number; // For fog parallax
}

function createParticles(category: WeatherCategory): Particle[] {
  const config = PARTICLE_CONFIG[category];
  if (config.count === 0) return [];
  
  if (category === 'fog') {
    // Create layered cloud bands for fog
    return Array.from({ length: config.count }, (_, i) => ({
      id: i,
      x: Math.random() * 140 - 20, // Start some off-screen left
      y: 20 + (i * 15) + Math.random() * 10, // Distributed vertically
      speed: config.speed * (0.5 + Math.random() * 0.5), // Varied speeds for parallax
      opacity: 0.25 + Math.random() * 0.15, // More visible
      size: config.size * (0.7 + Math.random() * 0.6),
      layer: i,
    }));
  }
  
  if (category === 'snow') {
    // Create varied snowflakes
    return Array.from({ length: config.count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 120 - 20, // Some start above
      speed: config.speed * (0.5 + Math.random() * 1.0), // More speed variation
      opacity: 0.4 + Math.random() * 0.4, // Much more visible (0.4-0.8)
      size: config.size * (0.4 + Math.random() * 1.2), // Size variation (small to medium)
      drift: (Math.random() - 0.5) * 0.8, // Horizontal drift
    }));
  }
  
  // Rain and other weather types
  return Array.from({ length: config.count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100 - 20,
    speed: config.speed * (0.7 + Math.random() * 0.6),
    opacity: 0.15 + Math.random() * 0.25,
    size: config.size * (0.6 + Math.random() * 0.8),
    drift: 0,
  }));
}

function createStars(): Particle[] {
  // Create faint, understated stars for night sky
  return Array.from({ length: 45 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 70, // Cover more vertical space
    speed: 0.005 + Math.random() * 0.015, // Very slow twinkle speed
    opacity: 0.15 + Math.random() * 0.25, // Subtle but visible (0.15-0.4)
    size: 0.8 + Math.random() * 1.5, // Small, delicate
  }));
}

const WeatherOverlay: React.FC<WeatherOverlayProps> = ({
  category,
  timeOfDay,
  isVisible,
  opacity,
  phase,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<Particle[]>([]);
  
  
  // Initialize particles
  const initialParticles = useMemo(() => createParticles(category), [category]);
  const initialStars = useMemo(() => 
    category === 'clear' && (timeOfDay === 'night' || timeOfDay === 'twilight') 
      ? createStars() 
      : [],
    [category, timeOfDay]
  );
  
  useEffect(() => {
    particlesRef.current = initialParticles;
    starsRef.current = initialStars;
  }, [initialParticles, initialStars]);
  
  // Animation loop
  useEffect(() => {
    if (!isVisible || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    const updateSize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };
    updateSize();
    
    const animate = () => {
      if (!ctx || !canvas.width || !canvas.height) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw weather particles
      if (category === 'rain') {
        ctx.strokeStyle = timeOfDay === 'night' 
          ? 'rgba(150, 170, 200, 0.4)' 
          : 'rgba(100, 120, 150, 0.35)';
        ctx.lineWidth = 1.5;
        
        particlesRef.current.forEach(p => {
          const x = (p.x / 100) * canvas.width;
          const y = (p.y / 100) * canvas.height;
          
          ctx.globalAlpha = p.opacity;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - 2, y + p.size * 5);
          ctx.stroke();
          
          // Update position
          p.y += p.speed * 0.15;
          if (p.y > 110) {
            p.y = -10;
            p.x = Math.random() * 100;
          }
        });
      } else if (category === 'snow') {
        // Enhanced snow: visible flakes with soft edges
        particlesRef.current.forEach(p => {
          const x = (p.x / 100) * canvas.width;
          const y = (p.y / 100) * canvas.height;
          
          // Soft snowflake with gradient
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, p.size);
          const baseColor = timeOfDay === 'night'
            ? 'rgba(200, 210, 230,'
            : 'rgba(180, 180, 190,'; // Muted for off-white bg
          
          gradient.addColorStop(0, `${baseColor} ${p.opacity})`);
          gradient.addColorStop(0.5, `${baseColor} ${p.opacity * 0.6})`);
          gradient.addColorStop(1, `${baseColor} 0)`);
          
          ctx.globalAlpha = 1;
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, p.size * 1.5, 0, Math.PI * 2);
          ctx.fill();
          
          // Update position with gentle fall and drift
          p.y += p.speed * 0.12;
          p.x += (p.drift || 0) * 0.15;
          
          // Slight oscillation for organic movement
          p.x += Math.sin(Date.now() / 2000 + p.id) * 0.02;
          
          if (p.y > 110) {
            p.y = -5;
            p.x = Math.random() * 100;
          }
          // Wrap horizontally
          if (p.x > 105) p.x = -5;
          if (p.x < -5) p.x = 105;
        });
      } else if (category === 'fog') {
        // Realistic cloud layers drifting left → right (no vertical bounce)
        particlesRef.current.forEach(p => {
          const x = (p.x / 100) * canvas.width;
          // Minimal vertical drift (1-2px, not oscillation)
          const microDrift = Math.sin(Date.now() / 8000 + p.id) * 2;
          const y = ((p.y) / 100) * canvas.height + microDrift;
          
          // Wide, stretched cloud band
          const cloudWidth = p.size * 2.0;
          const cloudHeight = p.size * 0.3;
          
          // Soft radial gradient for organic cloud edges
          const gradient = ctx.createRadialGradient(
            x, y, 0,
            x, y, cloudWidth
          );
          
          const baseColor = timeOfDay === 'night' 
            ? 'rgba(100, 110, 130,' 
            : 'rgba(140, 145, 155,';
          
          // Softer falloff for cloud-like appearance
          gradient.addColorStop(0, `${baseColor} ${p.opacity * 0.8})`);
          gradient.addColorStop(0.2, `${baseColor} ${p.opacity * 0.6})`);
          gradient.addColorStop(0.5, `${baseColor} ${p.opacity * 0.3})`);
          gradient.addColorStop(0.8, `${baseColor} ${p.opacity * 0.1})`);
          gradient.addColorStop(1, `${baseColor} 0)`);
          
          ctx.globalAlpha = 1;
          ctx.fillStyle = gradient;
          
          // Draw stretched ellipse for cloud band
          ctx.beginPath();
          ctx.ellipse(x, y, cloudWidth, cloudHeight, 0, 0, Math.PI * 2);
          ctx.fill();
          
          // Steady left → right drift (parallax via speed variation)
          p.x += p.speed * 0.06;
          if (p.x > 140) {
            p.x = -40;
          }
        });
      } else if (category === 'clear') {
        // Night: subtle cool tint + faint twinkling stars
        if (timeOfDay === 'night' || timeOfDay === 'twilight') {
          // Subtle cool bluish tint for night atmosphere
          if (timeOfDay === 'night') {
            ctx.globalAlpha = 0.06;
            ctx.fillStyle = 'rgba(30, 50, 80, 1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          
          // Faint stars with gentle twinkle
          starsRef.current.forEach(star => {
            const x = (star.x / 100) * canvas.width;
            const y = (star.y / 100) * canvas.height;
            
            // Very slow, gentle twinkle
            const twinkle = 0.6 + 0.4 * Math.sin(Date.now() / 2000 + star.id * 1.5);
            ctx.globalAlpha = star.opacity * twinkle;
            
            // Soft star glow
            const starGradient = ctx.createRadialGradient(x, y, 0, x, y, star.size * 2);
            starGradient.addColorStop(0, 'rgba(220, 225, 240, 1)');
            starGradient.addColorStop(0.5, 'rgba(200, 210, 230, 0.5)');
            starGradient.addColorStop(1, 'rgba(180, 190, 220, 0)');
            
            ctx.fillStyle = starGradient;
            ctx.beginPath();
            ctx.arc(x, y, star.size * 1.5, 0, Math.PI * 2);
            ctx.fill();
          });
        }
        
        // Sunny day: visible warm sun disc with soft glow
        if (timeOfDay === 'day') {
          const sunX = canvas.width * 0.75;
          const sunY = canvas.height * 0.15;
          const sunRadius = Math.min(canvas.width, canvas.height) * 0.08;
          
          // Gentle pulse
          const pulse = 0.95 + 0.05 * Math.sin(Date.now() / 5000);
          
          // Outer warm glow (larger, softer)
          ctx.globalAlpha = 0.12 * pulse;
          const outerGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius * 4);
          outerGlow.addColorStop(0, 'rgba(255, 235, 180, 1)');
          outerGlow.addColorStop(0.3, 'rgba(255, 230, 160, 0.6)');
          outerGlow.addColorStop(0.6, 'rgba(255, 225, 140, 0.2)');
          outerGlow.addColorStop(1, 'rgba(255, 220, 120, 0)');
          ctx.fillStyle = outerGlow;
          ctx.beginPath();
          ctx.arc(sunX, sunY, sunRadius * 4, 0, Math.PI * 2);
          ctx.fill();
          
          // Inner sun disc (muted cream/yellow)
          ctx.globalAlpha = 0.18 * pulse;
          const sunDisc = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius);
          sunDisc.addColorStop(0, 'rgba(255, 245, 210, 1)');
          sunDisc.addColorStop(0.6, 'rgba(255, 235, 180, 0.8)');
          sunDisc.addColorStop(1, 'rgba(255, 225, 150, 0)');
          ctx.fillStyle = sunDisc;
          ctx.beginPath();
          ctx.arc(sunX, sunY, sunRadius * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      ctx.globalAlpha = 1;
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isVisible, category, timeOfDay]);
  
  // Don't render if not visible and idle
  if (!isVisible && phase === 'idle') return null;
  
  const backgroundTint = BACKGROUND_TINTS[category][timeOfDay];
  
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden rounded-md"
      style={{
        opacity: opacity,
        transition: 'opacity 500ms ease-in-out',
        backgroundColor: backgroundTint,
        zIndex: 1,
      }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
};

export default WeatherOverlay;