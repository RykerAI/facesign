"use client";

import { useEffect, useRef } from "react";

const PALETTE = ["#6366f1", "#8b5cf6", "#3b82f6", "#a78bfa", "#60a5fa"];

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  colorIdx: number;
}

interface Props {
  count?: number;
  maxDist?: number;
  className?: string;
}

export function ParticleNetwork({ count = 90, maxDist = 130, className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const mouse = { x: -9999, y: -9999 };

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", () => { mouse.x = -9999; mouse.y = -9999; });

    // Build particles after first resize so canvas.width/height are set
    const particles: Particle[] = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.55,
      vy: (Math.random() - 0.5) * 0.55,
      size: Math.random() * 1.8 + 0.5,
      colorIdx: Math.floor(Math.random() * PALETTE.length),
    }));

    const MOUSE_RADIUS = 140;
    const MAX_SPEED = 1.4;

    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        // Mouse repulsion
        const mdx = p.x - mouse.x;
        const mdy = p.y - mouse.y;
        const md2 = mdx * mdx + mdy * mdy;
        if (md2 < MOUSE_RADIUS * MOUSE_RADIUS) {
          const md = Math.sqrt(md2);
          const force = ((MOUSE_RADIUS - md) / MOUSE_RADIUS) * 0.025;
          p.vx += (mdx / md) * force;
          p.vy += (mdy / md) * force;
        }

        // Speed cap
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > MAX_SPEED) { p.vx = (p.vx / speed) * MAX_SPEED; p.vy = (p.vy / speed) * MAX_SPEED; }

        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < -10) p.x = canvas.width + 10;
        else if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        else if (p.y > canvas.height + 10) p.y = -10;
      }

      // Connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.22;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(99,102,241,${alpha})`;
            ctx.lineWidth = 0.9;
            ctx.stroke();
          }
        }
      }

      // Dots
      for (const p of particles) {
        const mdx = p.x - mouse.x;
        const mdy = p.y - mouse.y;
        const nearMouse = mdx * mdx + mdy * mdy < MOUSE_RADIUS * MOUSE_RADIUS;

        if (nearMouse) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = PALETTE[p.colorIdx];
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, nearMouse ? p.size * 2 : p.size, 0, Math.PI * 2);
        ctx.fillStyle = nearMouse ? PALETTE[p.colorIdx] : PALETTE[p.colorIdx] + "90";
        ctx.fill();
        if (nearMouse) ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [count, maxDist]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    />
  );
}
