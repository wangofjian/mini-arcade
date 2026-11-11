export const PHONE_WIDTHS = [320, 375, 390, 430] as const;

/** Horizontal content width inside the shell padding. */
export function contentWidth(viewportWidth: number, paddingX = 10): number {
  return Math.max(0, viewportWidth - paddingX * 2);
}

/** Width of one cell in a fixed-column row that must not overflow. */
export function packedCellWidth(
  availableWidth: number,
  columns: number,
  gap = 6,
  maxWidth = 72,
  minWidth = 36,
): number {
  if (columns <= 0) return 0;
  const raw = Math.floor((availableWidth - gap * (columns - 1)) / columns);
  // Prefer a slightly smaller cell over a row that overflows the viewport.
  if (raw < minWidth) return Math.max(1, raw);
  return Math.min(maxWidth, raw);
}

export function packedRowWidth(cell: number, columns: number, gap = 6): number {
  if (columns <= 0) return 0;
  return cell * columns + gap * (columns - 1);
}

/** Scale a logical canvas to fit a box without overflow or upscaling past 1 unless allowed. */
export function fitSize(
  logicalW: number,
  logicalH: number,
  availableW: number,
  availableH = Infinity,
  allowUpscale = false,
): { width: number; height: number; scale: number } {
  if (logicalW <= 0 || logicalH <= 0) return { width: 0, height: 0, scale: 0 };
  let scale = Math.min(availableW / logicalW, availableH / logicalH);
  if (!allowUpscale) scale = Math.min(1, scale);
  scale = Math.max(0, scale);
  return { width: logicalW * scale, height: logicalH * scale, scale };
}

export function overflowsHorizontally(content: number, viewport: number, epsilon = 0.5): boolean {
  return content - viewport > epsilon;
}
