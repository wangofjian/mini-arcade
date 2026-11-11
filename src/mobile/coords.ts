/** Map a pointer position onto a logical canvas or SVG viewBox. */

export type RectLike = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type FitMode = 'fill' | 'contain';

export type LogicalPoint = {
  x: number;
  y: number;
  inside: boolean;
};

/**
 * Convert client (viewport) coordinates into the logical coordinate space
 * of a canvas or SVG that is CSS-scaled. `fill` stretches to the element box
 * (width:100%; height:auto with matching aspect). `contain` accounts for
 * object-fit:contain letterboxing.
 */
export function clientToLogical(
  rect: RectLike,
  clientX: number,
  clientY: number,
  logicalWidth: number,
  logicalHeight: number,
  fit: FitMode = 'fill',
): LogicalPoint {
  if (rect.width <= 0 || rect.height <= 0 || logicalWidth <= 0 || logicalHeight <= 0) {
    return { x: 0, y: 0, inside: false };
  }
  if (fit === 'fill') {
    const x = ((clientX - rect.left) * logicalWidth) / rect.width;
    const y = ((clientY - rect.top) * logicalHeight) / rect.height;
    return {
      x,
      y,
      inside: x >= 0 && y >= 0 && x <= logicalWidth && y <= logicalHeight,
    };
  }
  const scale = Math.min(rect.width / logicalWidth, rect.height / logicalHeight);
  const contentW = logicalWidth * scale;
  const contentH = logicalHeight * scale;
  const ox = rect.left + (rect.width - contentW) / 2;
  const oy = rect.top + (rect.height - contentH) / 2;
  const x = (clientX - ox) / scale;
  const y = (clientY - oy) / scale;
  return {
    x,
    y,
    inside: x >= 0 && y >= 0 && x <= logicalWidth && y <= logicalHeight,
  };
}

/** Four equal vertical lanes, as in the rhythm game's 4 tracks. */
export function laneFromLogicalX(
  x: number,
  logicalWidth: number,
  lanes: number,
  inset = 0,
): number {
  if (lanes <= 0) return 0;
  const inner = Math.max(1, logicalWidth - inset * 2);
  const t = Math.min(lanes - 1, Math.max(0, Math.floor(((x - inset) / inner) * lanes)));
  return t;
}
