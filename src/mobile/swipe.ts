export type SwipeDir = 'left' | 'right' | 'up' | 'down';

/** Dominant-axis swipe. Returns null if the movement is shorter than the threshold. */
export function swipeDirection(dx: number, dy: number, threshold = 24): SwipeDir | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) < threshold) return null;
  if (ax >= ay) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

export function swipeToVector(dir: SwipeDir): { x: number; y: number } {
  if (dir === 'left') return { x: -1, y: 0 };
  if (dir === 'right') return { x: 1, y: 0 };
  if (dir === 'up') return { x: 0, y: -1 };
  return { x: 0, y: 1 };
}
