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
  snow: { count: 100, speed: 1.5, size: 3 },
  fog: { count: 5, speed: 0.3, size: 180 }, // Cloud patches
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
    day: 'rgba(180, 185, 195, 0.08)',
    night: 'rgba(20, 35, 70, 0.14)', // Navy base for fog at night
    twilight: 'rgba(160, 150, 180, 0.08)',
  },
  clear: {
    day: 'rgba(255, 248, 225, 0.06)', // Warm cream for sunny
    night: 'rgba(12, 22, 50, 0.2)', // Strong navy tint - NOT gray
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
    // Create cloud patches (not bands) at varied positions
    return Array.from({ length: config.count }, (_, i) => ({
      id: i,
      x: Math.random() * 120 - 20, // Spread across and off-screen
      y: 15 + Math.random() * 55, // Distributed vertically in middle area
      speed: config.speed * (0.6 + Math.random() * 0.8), // Varied speeds for parallax
      opacity: 0.2 + Math.random() * 0.12, // Visible but not overwhelming
      size: config.size * (0.8 + Math.random() * 0.5), // Varied patch sizes
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
  // Many tiny, bright, sharp stars for night sky (NOT snow-like)
  return Array.from({ length: 150 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 90,
    speed: 0.0015 + Math.random() * 0.003, // Very slow twinkle
    opacity: 0.4 + Math.random() * 0.45, // Bright range (0.4-0.85)
    size: 0.6 + Math.random() * 0.8, // Tiny radius (0.6-1.4px) - sharp points
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
        // Realistic cloud patches drifting left → right
        particlesRef.current.forEach(p => {
          const x = (p.x / 100) * canvas.width;
          // Minimal vertical micro-drift (1-2px, no bobbing)
          const microDrift = Math.sin(Date.now() / 10000 + p.id * 3) * 1.5;
          const y = ((p.y) / 100) * canvas.height + microDrift;
          
          // Create cloud patch using multiple overlapping blurred circles
          const patchSize = p.size;
          const baseColor = timeOfDay === 'night' 
            ? 'rgba(85, 95, 115,' 
            : 'rgba(145, 150, 160,';
          
          // Draw multiple soft blobs to form one cloud patch
          const blobCount = 5;
          for (let b = 0; b < blobCount; b++) {
            const blobOffsetX = (b - 2) * (patchSize * 0.3);
            const blobOffsetY = Math.sin(b * 1.5) * (patchSize * 0.1);
            const blobRadius = patchSize * (0.35 + (b % 3) * 0.1);
            
            const gradient = ctx.createRadialGradient(
              x + blobOffsetX, y + blobOffsetY, 0,
              x + blobOffsetX, y + blobOffsetY, blobRadius
            );
            
            const blobOpacity = p.opacity * (0.7 + b * 0.06);
            gradient.addColorStop(0, `${baseColor} ${blobOpacity})`);
            gradient.addColorStop(0.3, `${baseColor} ${blobOpacity * 0.55})`);
            gradient.addColorStop(0.65, `${baseColor} ${blobOpacity * 0.2})`);
            gradient.addColorStop(1, `${baseColor} 0)`);
            
            ctx.globalAlpha = 1;
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x + blobOffsetX, y + blobOffsetY, blobRadius, 0, Math.PI * 2);
            ctx.fill();
          }
          
          // Steady left → right drift with visible speed
          p.x += p.speed * 0.18;
          if (p.x > 125) {
            p.x = -25; // Seamless wraparound
          }
        });
      } else if (category === 'clear') {
        // Night: navy tint + many tiny bright twinkling stars
        if (timeOfDay === 'night' || timeOfDay === 'twilight') {
          // Navy/cool blue tint overlay (clearly night, NOT gray)
          if (timeOfDay === 'night') {
            ctx.globalAlpha = 0.14;
            ctx.fillStyle = 'rgba(12, 22, 55, 1)'; // Deep navy
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          
          // Many tiny sharp stars with gentle twinkle (stationary, NOT snow-like)
          starsRef.current.forEach(star => {
            const x = (star.x / 100) * canvas.width;
            const y = (star.y / 100) * canvas.height;
            
            // Gentle slow twinkle (sine-based alpha, varied phase)
            const twinkle = 0.55 + 0.45 * Math.sin(Date.now() * star.speed + star.id * 7);
            ctx.globalAlpha = star.opacity * twinkle;
            
            // Sharp point star (no heavy glow, crisp dot)
            ctx.fillStyle = 'rgba(240, 248, 255, 1)'; // Bright white-blue
            ctx.beginPath();
            ctx.arc(x, y, star.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Very subtle halo (minimal, not snow-like)
            ctx.globalAlpha = star.opacity * twinkle * 0.2;
            ctx.beginPath();
            ctx.arc(x, y, star.size * 1.8, 0, Math.PI * 2);
            ctx.fill();
          });
        }
        
        // Sunny day: large centered sun disc with warm glow
        if (timeOfDay === 'day') {
          const sunX = canvas.width * 0.5; // Centered horizontally
          const sunY = canvas.height * 0.38; // Slightly above center
          const sunRadius = Math.min(canvas.width, canvas.height) * 0.18; // Much larger
          
          // Gentle pulse
          const pulse = 0.92 + 0.08 * Math.sin(Date.now() / 4000);
          
          // Outer warm glow (large, soft)
          ctx.globalAlpha = 0.15 * pulse;
          const outerGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius * 3);
          outerGlow.addColorStop(0, 'rgba(255, 240, 190, 1)'); // Muted cream/yellow
          outerGlow.addColorStop(0.25, 'rgba(255, 235, 170, 0.7)');
          outerGlow.addColorStop(0.5, 'rgba(255, 228, 150, 0.35)');
          outerGlow.addColorStop(0.75, 'rgba(255, 220, 130, 0.12)');
          outerGlow.addColorStop(1, 'rgba(255, 215, 110, 0)');
          ctx.fillStyle = outerGlow;
          ctx.beginPath();
          ctx.arc(sunX, sunY, sunRadius * 3, 0, Math.PI * 2);
          ctx.fill();
          
          // Inner sun disc (muted warm cream)
          ctx.globalAlpha = 0.22 * pulse;
          const sunDisc = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius);
          sunDisc.addColorStop(0, 'rgba(255, 248, 220, 1)'); // Soft cream center
          sunDisc.addColorStop(0.4, 'rgba(255, 240, 195, 0.85)');
          sunDisc.addColorStop(0.7, 'rgba(255, 232, 170, 0.5)');
          sunDisc.addColorStop(1, 'rgba(255, 225, 150, 0)');
          ctx.fillStyle = sunDisc;
          ctx.beginPath();
          ctx.arc(sunX, sunY, sunRadius * 1.2, 0, Math.PI * 2);
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