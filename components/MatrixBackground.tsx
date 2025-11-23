import React, { useEffect, useRef, memo } from 'react';

interface MatrixParticle {
  x: number;
  y: number;
  z: number; // Depth factor (0 to 1)
  size: number;
  speed: number;
  glowOffset: number;
}

// Using memo to prevent re-renders from parent state changes
export const MatrixBackground = memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const setSize = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    };
    setSize();

    // Density: One column every ~15px
    const columns = Math.floor(width / 15);
    const particles: MatrixParticle[] = [];

    // Initialize particles
    for (let i = 0; i < columns; i++) {
      particles.push(createParticle(width, height, true));
    }

    function createParticle(w: number, h: number, randomY = false): MatrixParticle {
      const z = Math.random(); // 0 = far away/small, 1 = close/big
      const size = 10 + (z * 14); // Size between 10px and 24px

      return {
        x: Math.random() * w, 
        y: randomY ? Math.random() * h : -50,
        z: z,
        size: size,
        // Calm "Zero-G" speed as requested (preserved from previous feedback)
        speed: (0.5 + (z * 1.2)) * (Math.random() * 0.5 + 0.8), 
        glowOffset: Math.random() * Math.PI * 2
      };
    }

    const draw = () => {
      // Trail Effect
      ctx.fillStyle = 'rgba(5, 5, 5, 0.18)'; 
      ctx.fillRect(0, 0, width, height);

      // Slower time base for a "breathing" rhythm (gradual fade in/out)
      const time = Date.now() * 0.001; 

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        ctx.font = `bold ${p.size}px monospace`;
        
        // --- GRADUAL GLOW CALCULATION ---
        
        // 1. Oscillate between 0 and 1 smoothly
        const wave = (Math.sin(time + p.glowOffset) + 1) / 2;
        
        // 2. Apply power curve. 
        // Power of 8 creates a smooth bell curve:
        // Stays low for most of the cycle, but rises gradually to 1 at the peak.
        // This eliminates the "short flash" feel and replaces it with a "glow up".
        const glowIntensity = Math.pow(wave, 8); 

        // 3. Define Start (Base) & End (Flash) States
        
        // Colors: Slate (60,80,90) -> Bright Cyan (180,255,255)
        const r = 60 + (120 * glowIntensity);
        const g = 80 + (175 * glowIntensity);
        const b = 90 + (165 * glowIntensity);

        // Alpha: Faint (0.02-0.15) -> Bright (0.8-1.0)
        const baseAlpha = 0.02 + (p.z * 0.13);
        const flashAlpha = 0.8 + (p.z * 0.2);
        
        // Interpolate Alpha
        const a = baseAlpha + ((flashAlpha - baseAlpha) * glowIntensity);

        // 4. Apply interpolated style
        ctx.fillStyle = `rgba(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)}, ${a})`;

        ctx.fillText("X", p.x, p.y);

        // Move particle
        p.y += p.speed;

        // Reset if off screen
        if (p.y > height + 50) {
          particles[i] = createParticle(width, height, false);
        }
      }
    };

    let animationId: number;
    
    const render = () => {
        draw();
        animationId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
        setSize();
        // Re-init on resize
        particles.length = 0;
        const newCols = Math.floor(window.innerWidth / 15);
        for(let i=0; i<newCols; i++) {
            particles.push(createParticle(window.innerWidth, window.innerHeight, true));
        }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full pointer-events-none opacity-60 will-change-transform"
    />
  );
});