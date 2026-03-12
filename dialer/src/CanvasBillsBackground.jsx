import { useEffect, useRef } from 'react';

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// Ruido suave barato (value noise) para viento irregular
function noise1(t, seed) {
  const x = t * 0.12 + seed * 10.0;
  const i = Math.floor(x);
  const f = x - i;
  const a = Math.sin((i + seed) * 127.1) * 43758.5453123;
  const b = Math.sin((i + 1 + seed) * 127.1) * 43758.5453123;
  const va = a - Math.floor(a);
  const vb = b - Math.floor(b);
  const u = f * f * (3 - 2 * f);
  return va * (1 - u) + vb * u; // 0..1
}

export default function CanvasBillsBackground({ count = 36, opacity = 0.55 }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const stateRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let mounted = true;
    const front = new Image();
    const back = new Image();
    front.src = '/bill100-front.png';
    back.src = '/bill100-back.png';

    const bills = Array.from({ length: count }).map((_, idx) => {
      const scale = rand(0.65, 1.25);
      const w = 220 * scale;
      const h = 100 * scale;
      return {
        id: idx,
        x: rand(0, window.innerWidth),
        y: rand(-window.innerHeight, window.innerHeight),
        vx: rand(-20, 20),
        vy: rand(55, 140),
        w,
        h,
        rot: rand(0, Math.PI * 2),
        vr: rand(-0.8, 0.8),
        flip: rand(0, Math.PI * 2),
        vflip: rand(1.4, 3.4) * (Math.random() > 0.5 ? 1 : -1),
        seed: rand(0, 1000),
        gust: rand(-1, 1),
      };
    });

    const size = { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 };
    stateRef.current = { bills, frontReady: false, backReady: false, lastTs: 0, size };

    const onResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const { innerWidth: w, innerHeight: h } = window;
      const s = stateRef.current;
      if (s) s.size = { w, h, dpr };
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    };
    onResize();
    window.addEventListener('resize', onResize);

    const tick = (ts) => {
      const s = stateRef.current;
      if (!mounted || !s) return;
      const last = s.lastTs || ts;
      const dt = clamp((ts - last) / 1000, 0, 0.05);
      s.lastTs = ts;

      // Limpiar en coordenadas CSS (ya está aplicado el transform del DPR)
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, s.size.w, s.size.h);

      const W = s.size.w;
      const H = s.size.h;

      // viento global irregular (más suave)
      const wind = (noise1(ts / 1000, 0.37) - 0.5) * 80; // px/s

      for (const b of s.bills) {
        // ráfagas por billete (irregular)
        const gust = (noise1(ts / 1000, b.seed) - 0.5) * 140;
        const flutter = Math.sin(b.flip) * 0.35 + Math.sin(b.flip * 0.43 + 1.7) * 0.22;

        // dinámica (caída + deriva irregular)
        b.vx += (wind * 0.10 + gust * 0.14) * dt;
        b.vx *= 0.992; // drag lateral (menos brusco)
        b.vy = clamp(b.vy + (flutter * 12) * dt, 45, 190);

        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.rot += b.vr * dt + flutter * 0.035;
        b.flip += b.vflip * dt;

        // wrap horizontal suave
        if (b.x < -b.w) b.x = W + b.w;
        if (b.x > W + b.w) b.x = -b.w;

        // respawn arriba cuando sale
        if (b.y > H + b.h * 1.2) {
          b.y = -b.h * rand(0.4, 2.2);
          b.x = rand(-b.w, W + b.w);
          b.vx = rand(-22, 22);
          b.vy = rand(55, 135);
          b.rot = rand(0, Math.PI * 2);
          b.vr = rand(-0.9, 0.9);
          b.flip = rand(0, Math.PI * 2);
          b.vflip = rand(1.4, 3.4) * (Math.random() > 0.5 ? 1 : -1);
        }

        // “flip” realista: escala X con cos; cara depende del signo
        const c = Math.cos(b.flip);
        const face = c >= 0 ? front : back;
        const flipScaleX = Math.max(0.12, Math.abs(c)); // menos “aplastado”
        const alpha = opacity * (0.65 + flipScaleX * 0.35);

        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        ctx.scale(flipScaleX, 1);
        ctx.globalAlpha = alpha;

        // sombra (sin “estela”)
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 8;

        // imagen
        ctx.drawImage(face, -b.w / 2, -b.h / 2, b.w, b.h);

        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    const startIfReady = () => {
      const s = stateRef.current;
      if (!s) return;
      if (front.complete && front.naturalWidth > 0) s.frontReady = true;
      if (back.complete && back.naturalWidth > 0) s.backReady = true;
      if (s.frontReady && s.backReady) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    front.onload = startIfReady;
    back.onload = startIfReady;
    startIfReady();

    return () => {
      mounted = false;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, [count, opacity]);

  return <canvas ref={canvasRef} className="cs-bills-canvas" aria-hidden="true" />;
}

