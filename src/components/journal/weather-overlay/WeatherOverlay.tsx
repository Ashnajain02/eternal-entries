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
  snow: { count: 60, speed: 2, size: 4 },
  fog: { count: 8, speed: 0.3, size: 200 },
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
}

function createParticles(category: WeatherCategory): Particle[] {
  const config = PARTICLE_CONFIG[category];
  if (config.count === 0) return [];
  
  return Array.from({ length: config.count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100 - 20,
    speed: config.speed * (0.7 + Math.random() * 0.6),
    opacity: 0.15 + Math.random() * 0.25,
    size: config.size * (0.6 + Math.random() * 0.8),
    drift: category === 'snow' ? (Math.random() - 0.5) * 0.5 : 0,
  }));
}

function createStars(): Particle[] {
  return Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 60,
    speed: 0.01 + Math.random() * 0.02,
    opacity: 0.1 + Math.random() * 0.2,
    size: 1 + Math.random() * 2,
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
        ctx.fillStyle = timeOfDay === 'night'
          ? 'rgba(220, 230, 250, 0.5)'
          : 'rgba(255, 255, 255, 0.6)';
        
        particlesRef.current.forEach(p => {
          const x = (p.x / 100) * canvas.width;
          const y = (p.y / 100) * canvas.height;
          
          ctx.globalAlpha = p.opacity;
          ctx.beginPath();
          ctx.arc(x, y, p.size, 0, Math.PI * 2);
          ctx.fill();
          
          // Update position with drift
          p.y += p.speed * 0.08;
          p.x += (p.drift || 0) * 0.1;
          
          if (p.y > 110) {
            p.y = -5;
            p.x = Math.random() * 100;
          }
        });
      } else if (category === 'fog') {
        particlesRef.current.forEach(p => {
          const x = (p.x / 100) * canvas.width;
          const y = 30 + (p.id % 4) * 20 + Math.sin(Date.now() / 3000 + p.id) * 10;
          const yPos = (y / 100) * canvas.height;
          
          const gradient = ctx.createRadialGradient(x, yPos, 0, x, yPos, p.size);
          const baseColor = timeOfDay === 'night' 
            ? 'rgba(100, 110, 130,' 
            : 'rgba(180, 185, 195,';
          gradient.addColorStop(0, `${baseColor} 0.1)`);
          gradient.addColorStop(1, `${baseColor} 0)`);
          
          ctx.globalAlpha = 1;
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, yPos, p.size, 0, Math.PI * 2);
          ctx.fill();
          
          // Slow drift
          p.x += p.speed * 0.02;
          if (p.x > 120) p.x = -20;
        });
      } else if (category === 'clear') {
        // Draw stars for night/twilight
        if (timeOfDay === 'night' || timeOfDay === 'twilight') {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          starsRef.current.forEach(star => {
            const x = (star.x / 100) * canvas.width;
            const y = (star.y / 100) * canvas.height;
            
            const twinkle = 0.5 + 0.5 * Math.sin(Date.now() / 1000 + star.id);
            ctx.globalAlpha = star.opacity * twinkle;
            ctx.beginPath();
            ctx.arc(x, y, star.size, 0, Math.PI * 2);
            ctx.fill();
          });
        }
        
        // Subtle ambient glow for day
        if (timeOfDay === 'day') {
          const pulse = 0.9 + 0.1 * Math.sin(Date.now() / 4000);
          ctx.globalAlpha = 0.05 * pulse;
          const gradient = ctx.createRadialGradient(
            canvas.width * 0.7, 
            canvas.height * 0.2, 
            0,
            canvas.width * 0.7, 
            canvas.height * 0.2, 
            canvas.width * 0.5
          );
          gradient.addColorStop(0, 'rgba(255, 240, 200, 1)');
          gradient.addColorStop(1, 'rgba(255, 240, 200, 0)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
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
        style={{ mixBlendMode: 'multiply' }}
      />
    </div>
  );
};

export default WeatherOverlay;