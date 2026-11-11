import { useEffect, useState, type RefObject } from 'react';
import { fitSize } from './scale';

export type StageFit = { width: number; height: number; scale: number };

/** Measure a stage element and fit a logical playfield into it. */
export function useStageFit(
  stageRef: RefObject<HTMLElement | null>,
  logicalW: number,
  logicalH: number,
  enabled: boolean,
  allowUpscale = true,
): StageFit {
  const [fit, setFit] = useState<StageFit>({
    width: Math.max(1, logicalW),
    height: Math.max(1, logicalH),
    scale: 1,
  });

  useEffect(() => {
    if (!enabled) return;
    const stage = stageRef.current;
    if (!stage) return;

    const measure = () => {
      const box = stage.getBoundingClientRect();
      const availW = Math.max(0, box.width || stage.clientWidth);
      const availH = Math.max(0, box.height || stage.clientHeight);
      const next = fitSize(logicalW, logicalH, availW, availH, allowUpscale);
      setFit({
        width: Math.max(1, Math.floor(next.width)),
        height: Math.max(1, Math.floor(next.height)),
        scale: next.scale,
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
    };
  }, [stageRef, logicalW, logicalH, enabled, allowUpscale]);

  return fit;
}

/** CSS size for a fitted playfield; fall back to fluid sizing when not immersive. */
export function fittedBoxStyle(
  immersive: boolean,
  fit: StageFit,
  fallback?: { width?: string; maxWidth?: number | string; aspectRatio?: string },
): { width: number | string; height?: number | string; maxWidth?: number | string; aspectRatio?: string; display: 'block' } {
  if (immersive) {
    return { width: fit.width, height: fit.height, maxWidth: 'none', display: 'block' };
  }
  return {
    width: fallback?.width ?? '100%',
    maxWidth: fallback?.maxWidth,
    aspectRatio: fallback?.aspectRatio,
    display: 'block',
  };
}
