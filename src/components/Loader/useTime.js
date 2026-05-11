// requestAnimationFrame-driven seconds-since-mount hook.
// Pause when document is hidden to save battery on PWA.

import { useEffect, useState } from 'react';

export function useTime() {
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf;
    let start = performance.now();
    let accumulated = 0;

    const tick = (now) => {
      setT(accumulated + (now - start) / 1000);
      raf = requestAnimationFrame(tick);
    };

    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        accumulated += (performance.now() - start) / 1000;
      } else {
        start = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  return t;
}

export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
