import React, { useEffect, useRef, useMemo } from 'react';
import { WeatherCategory, TimeOfDay } from './types';

interface ContentAreaBounds {
  top: number;    // percentage (0-100) of canvas height
  bottom: number; // percentage (0-100) of canvas height
}

interface WeatherOverlayProps {
  category: WeatherCategory;
  timeOfDay: TimeOfDay;
  isVisible: boolean;
  opacity: number;
  phase: 'idle' | 'fading-in' | 'playing' | 'fading-out';
  contentAreaBounds?: ContentAreaBounds;
  fullscreen?: boolean;
}

// Particle configuration based on weather
const PARTICLE_CONFIG = {
  rain: { count: 130, speed: 14, size: 3 },
  snow: { count: 150, speed: 1.5, size: 5 },
  fog: { count: 8, speed: 0.3, size: 250 }, // Cloud patches
  clear: { count: 0, speed: 0, size: 0 },
};

// No background tints — just particles on transparent background
const BACKGROUND_TINTS = {
  rain: { morning: 'transparent', evening: 'transparent', night: 'transparent' },
  snow: { morning: 'transparent', evening: 'transparent', night: 'transparent' },
  fog: { morning: 'transparent', evening: 'transparent', night: 'transparent' },
  clear: { morning: 'transparent', evening: 'transparent', night: 'transparent' },
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
  
  // Rain - thicker, more visible cool blue drops
  return Array.from({ length: config.count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100 - 20,
    speed: config.speed * (0.7 + Math.random() * 0.6),
    opacity: 0.25 + Math.random() * 0.3, // More visible (0.25-0.55)
    size: config.size * (0.9 + Math.random() * 0.8), // Thicker drops (0.9-1.7x)
    drift: 0,
  }));
}

function createStars(): Particle[] {
  return Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 90,
    speed: 0.0012 + Math.random() * 0.002,
    opacity: 0.7 + Math.random() * 0.3,
    size: 1.0 + Math.random() * 1.5,
  }));
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

function createShootingStarGroup(): ShootingStar[] {
  // Pick a direction — from left or right
  const fromRight = Math.random() > 0.5;
  const baseX = fromRight ? 70 + Math.random() * 25 : Math.random() * 25;
  const baseY = Math.random() * 30 + 5;
  const dir = fromRight ? -1 : 1;

  // 3 grouped together with slight offsets
  return Array.from({ length: 3 }, (_, i) => ({
    x: baseX + (i - 1) * (4 + Math.random() * 6) * dir,
    y: baseY + (i - 1) * (3 + Math.random() * 5),
    vx: (0.7 + Math.random() * 0.3) * dir,
    vy: 0.25 + Math.random() * 0.2,
    life: i * 5, // stagger slightly so they don't start at the exact same frame
    maxLife: 90 + Math.random() * 40,
    size: 1.5 + Math.random() * 1,
  }));
}

const WeatherOverlay: React.FC<WeatherOverlayProps> = ({
  category,
  timeOfDay,
  isVisible,
  opacity,
  phase,
  contentAreaBounds,
  fullscreen = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<Particle[]>([]);
  const shootingStarsRef = useRef<ShootingStar[]>([]);
  const lastShootingStarTime = useRef(0);
  
  
  // Initialize particles
  const initialParticles = useMemo(() => createParticles(category), [category]);
  const initialStars = useMemo(() => 
    category === 'clear' && timeOfDay === 'night' 
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
      if (fullscreen) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      } else {
        const rect = canvas.parentElement?.getBoundingClientRect();
        if (rect) {
          canvas.width = rect.width;
          canvas.height = rect.height;
        }
      }
    };
    updateSize();

    window.addEventListener('resize', updateSize);
    
    const animate = () => {
      if (!ctx || !canvas.width || !canvas.height) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const now = Date.now();

      // Draw weather particles
      if (category === 'rain') {
        // Cool blue rain color - elegant and muted but noticeable
        ctx.strokeStyle = timeOfDay === 'night' 
          ? 'rgba(120, 160, 210, 0.5)' // Cooler blue at night
          : 'rgba(90, 140, 190, 0.45)'; // Muted cool blue during day
        ctx.lineWidth = 2.8;
        
        particlesRef.current.forEach(p => {
          const x = (p.x / 100) * canvas.width;
          const y = (p.y / 100) * canvas.height;
          
          ctx.globalAlpha = p.opacity;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - 2, y + p.size * 8);
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
          p.x += Math.sin(now / 2000 + p.id) * 0.02;
          
          if (p.y > 110) {
            p.y = -5;
            p.x = Math.random() * 100;
          }
          // Wrap horizontally
          if (p.x > 105) p.x = -5;
          if (p.x < -5) p.x = 105;
        });
      } else if (category === 'fog') {
        // Realistic cloud patches drifting left → right (UNCHANGED - perfect as-is)
        particlesRef.current.forEach(p => {
          const x = (p.x / 100) * canvas.width;
          // Minimal vertical micro-drift (1-2px, no bobbing)
          const microDrift = Math.sin(now / 10000 + p.id * 3) * 1.5;
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
        // Clear weather: sun or stars based on time of day
        
        if (timeOfDay === 'night') {
          // NIGHT: Just big bright twinkling stars, no overlay

          starsRef.current.forEach(star => {
            const x = (star.x / 100) * canvas.width;
            const y = (star.y / 100) * canvas.height;

            // Gentle twinkle — never goes below 0.7 so stars always visible
            const twinkle = 0.75 + 0.25 * Math.sin(now * star.speed + star.id * 7);
            ctx.globalAlpha = star.opacity * twinkle;

            // Star point
            ctx.fillStyle = 'rgba(255, 230, 120, 1)';
            ctx.beginPath();
            ctx.arc(x, y, star.size * 1.4, 0, Math.PI * 2);
            ctx.fill();

            // Soft glow halo
            ctx.globalAlpha = star.opacity * twinkle * 0.2;
            ctx.fillStyle = 'rgba(255, 220, 100, 1)';
            ctx.beginPath();
            ctx.arc(x, y, star.size * 3, 0, Math.PI * 2);
            ctx.fill();
          });

          // Shooting stars — spawn a group of 3 every ~8-18 seconds
          
          if (now - lastShootingStarTime.current > 8000 + Math.random() * 10000) {
            if (shootingStarsRef.current.length === 0) {
              shootingStarsRef.current.push(...createShootingStarGroup());
              lastShootingStarTime.current = now;
            }
          }

          // Render and update shooting stars
          shootingStarsRef.current = shootingStarsRef.current.filter(ss => {
            ss.x += ss.vx;
            ss.y += ss.vy;
            ss.life++;

            const progress = ss.life / ss.maxLife;
            const alpha = progress < 0.1
              ? progress / 0.1
              : progress > 0.7
                ? (1 - progress) / 0.3
                : 1;

            const sx = (ss.x / 100) * canvas.width;
            const sy = (ss.y / 100) * canvas.height;
            const angle = Math.atan2(ss.vy, ss.vx);
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);

            // Soft glow tail
            const tailLen = 80 + ss.size * 25;
            const tailGrad = ctx.createLinearGradient(
              sx, sy,
              sx - cosA * tailLen,
              sy - sinA * tailLen
            );
            tailGrad.addColorStop(0, `rgba(255, 210, 100, ${alpha * 0.7})`);
            tailGrad.addColorStop(0.3, `rgba(255, 210, 100, ${alpha * 0.2})`);
            tailGrad.addColorStop(1, 'rgba(255, 210, 100, 0)');
            ctx.globalAlpha = 1;
            ctx.strokeStyle = tailGrad;
            ctx.lineWidth = ss.size * 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx - cosA * tailLen, sy - sinA * tailLen);
            ctx.stroke();

            // Core trail
            const coreLen = 50 + ss.size * 15;
            const coreGrad = ctx.createLinearGradient(
              sx, sy,
              sx - cosA * coreLen,
              sy - sinA * coreLen
            );
            coreGrad.addColorStop(0, `rgba(255, 245, 200, ${alpha})`);
            coreGrad.addColorStop(0.4, `rgba(255, 230, 140, ${alpha * 0.4})`);
            coreGrad.addColorStop(1, 'rgba(255, 230, 140, 0)');
            ctx.strokeStyle = coreGrad;
            ctx.lineWidth = ss.size * 1.2;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx - cosA * coreLen, sy - sinA * coreLen);
            ctx.stroke();

            // Head glow
            ctx.globalAlpha = alpha * 0.3;
            const headGlow = ctx.createRadialGradient(sx, sy, 0, sx, sy, ss.size * 6);
            headGlow.addColorStop(0, 'rgba(255, 230, 120, 1)');
            headGlow.addColorStop(0.5, 'rgba(255, 210, 80, 0.3)');
            headGlow.addColorStop(1, 'rgba(255, 210, 80, 0)');
            ctx.fillStyle = headGlow;
            ctx.beginPath();
            ctx.arc(sx, sy, ss.size * 6, 0, Math.PI * 2);
            ctx.fill();

            // Bright core point
            ctx.globalAlpha = alpha;
            ctx.fillStyle = 'rgba(255, 250, 220, 1)';
            ctx.beginPath();
            ctx.arc(sx, sy, ss.size * 1.5, 0, Math.PI * 2);
            ctx.fill();

            return ss.life < ss.maxLife;
          });
        } else {
          // MORNING or EVENING: Draw sun disc centered in content area
          
          // Calculate sun position - centered in content area if bounds provided
          const sunX = canvas.width * 0.5; // Always horizontally centered
          let sunY: number;
          
          if (contentAreaBounds) {
            // Center sun vertically within the content area
            const contentTopPx = (contentAreaBounds.top / 100) * canvas.height;
            const contentBottomPx = (contentAreaBounds.bottom / 100) * canvas.height;
            sunY = (contentTopPx + contentBottomPx) / 2;
          } else {
            // Fallback: center of canvas (slightly above)
            sunY = canvas.height * 0.45;
          }
          
          const sunRadius = Math.min(canvas.width, canvas.height) * 0.2; // Large sun
          
          // Gentle pulse
          const pulse = 0.92 + 0.08 * Math.sin(now / 4000);
          
          // Different sun colors for morning vs evening
          const isMorning = timeOfDay === 'morning';
          
          // Morning: bright yellow sun | Evening: larger, darker golden sun
          const sunColors = isMorning
            ? {
                outerStart: 'rgba(255, 240, 140, 1)',     // Warm bright yellow
                outerMid1: 'rgba(255, 230, 120, 0.8)',
                outerMid2: 'rgba(255, 220, 100, 0.5)',
                outerMid3: 'rgba(255, 210, 85, 0.2)',
                outerEnd: 'rgba(255, 200, 70, 0)',
                innerStart: 'rgba(255, 250, 200, 1)',     // Bright warm center
                innerMid1: 'rgba(255, 240, 160, 0.9)',
                innerMid2: 'rgba(255, 230, 130, 0.65)',
                innerEnd: 'rgba(255, 215, 100, 0)',
                glowAlpha: 0.25,
                discAlpha: 0.4,
                radiusScale: 1.4,
              }
            : {
                outerStart: 'rgba(240, 185, 110, 1)',      // Warm golden
                outerMid1: 'rgba(235, 170, 100, 0.75)',
                outerMid2: 'rgba(225, 160, 90, 0.45)',
                outerMid3: 'rgba(215, 150, 80, 0.2)',
                outerEnd: 'rgba(205, 140, 70, 0)',
                innerStart: 'rgba(250, 210, 150, 1)',     // Brighter amber center
                innerMid1: 'rgba(245, 195, 130, 0.9)',
                innerMid2: 'rgba(235, 180, 110, 0.6)',
                innerEnd: 'rgba(225, 170, 100, 0)',
                glowAlpha: 0.4,
                discAlpha: 0.55,
                radiusScale: 1.4,
              };
          
          // Scale radius for evening (larger sun)
          const scaledRadius = sunRadius * (sunColors.radiusScale || 1);

          // Outer warm glow (large, soft)
          ctx.globalAlpha = sunColors.glowAlpha * pulse;
          const outerGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, scaledRadius * 3);
          outerGlow.addColorStop(0, sunColors.outerStart);
          outerGlow.addColorStop(0.25, sunColors.outerMid1);
          outerGlow.addColorStop(0.5, sunColors.outerMid2);
          outerGlow.addColorStop(0.75, sunColors.outerMid3);
          outerGlow.addColorStop(1, sunColors.outerEnd);
          ctx.fillStyle = outerGlow;
          ctx.beginPath();
          ctx.arc(sunX, sunY, scaledRadius * 3, 0, Math.PI * 2);
          ctx.fill();

          // Inner sun disc
          ctx.globalAlpha = sunColors.discAlpha * pulse;
          const sunDisc = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, scaledRadius);
          sunDisc.addColorStop(0, sunColors.innerStart);
          sunDisc.addColorStop(0.4, sunColors.innerMid1);
          sunDisc.addColorStop(0.7, sunColors.innerMid2);
          sunDisc.addColorStop(1, sunColors.innerEnd);
          ctx.fillStyle = sunDisc;
          ctx.beginPath();
          ctx.arc(sunX, sunY, scaledRadius * 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      ctx.globalAlpha = 1;
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      window.removeEventListener('resize', updateSize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isVisible, category, timeOfDay, contentAreaBounds, fullscreen]);
  
  // Don't render if not visible and idle
  if (!isVisible && phase === 'idle') return null;
  
  const backgroundTint = BACKGROUND_TINTS[category][timeOfDay];
  
  return (
    <div
      className={fullscreen
        ? "fixed inset-0 pointer-events-none overflow-hidden"
        : "absolute inset-0 pointer-events-none overflow-hidden rounded-md"
      }
      style={{
        opacity: opacity,
        transition: 'opacity 500ms ease-in-out',
        backgroundColor: backgroundTint,
        zIndex: fullscreen ? 0 : 1,
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
