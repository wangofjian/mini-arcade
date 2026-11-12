/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { allEntries } from '../catalog';
import { fitSize } from './scale';
import {
  GAME_SOURCE_FILES,
  IMMERSIVE_POLICY,
  PHONE_FRAMES,
  type GameImmersivePolicy,
} from './immersivePolicy';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function sourceOf(slug: string): string {
  const rel = GAME_SOURCE_FILES[slug];
  expect(rel, slug + ' source path').toBeTruthy();
  return readFileSync(resolve(root, rel), 'utf8');
}

describe('immersive policy covers the catalog', () => {
  it('has a policy for every catalog entry and no extras', () => {
    const slugs = allEntries.map((g) => g.slug).sort();
    const policySlugs = Object.keys(IMMERSIVE_POLICY).sort();
    expect(policySlugs).toEqual(slugs);
    expect(slugs).toHaveLength(42);
  });

  it('only TinyLang skips fullscreen', () => {
    const skipped = allEntries.filter((g) => IMMERSIVE_POLICY[g.slug].kind === 'skip').map((g) => g.slug);
    expect(skipped).toEqual(['tinylang']);
  });

  it('pad games declare at least one direction mapping', () => {
    for (const game of allEntries) {
      const policy = IMMERSIVE_POLICY[game.slug];
      if (policy.kind !== 'pad') continue;
      const dirs = Object.entries(policy.dirs ?? {}).filter(([, d]) => !d.optional);
      expect(dirs.length, game.slug + ' dirs').toBeGreaterThan(0);
    }
  });
});

describe('game source wiring', () => {
  it('non-skip games enter immersive with 全屏游玩 and an exit control', () => {
    for (const game of allEntries) {
      const policy = IMMERSIVE_POLICY[game.slug];
      const src = sourceOf(game.slug);
      if (policy.kind === 'skip') {
        expect(src).not.toMatch(/全屏游玩/);
        expect(src).not.toMatch(/useImmersivePlay|ImmersiveFrame/);
        continue;
      }
      expect(src, game.slug + ' 全屏游玩').toMatch(/全屏游玩/);
      expect(src, game.slug + ' exit or frame').toMatch(/退出全屏|ImmersiveFrame/);
      expect(src, game.slug + ' hook/frame').toMatch(/useImmersivePlay|ImmersiveFrame/);
    }
  });

  it('pad games import HandheldPad; touch games do not force one', () => {
    for (const game of allEntries) {
      const policy = IMMERSIVE_POLICY[game.slug];
      const src = sourceOf(game.slug);
      if (policy.kind === 'pad') {
        expect(src, game.slug + ' HandheldPad').toMatch(/HandheldPad/);
      } else {
        expect(src, game.slug + ' no unused pad').not.toMatch(/HandheldPad/);
      }
    }
  });

  it('direction mappings in policy use supported pad modes', () => {
    const modes = new Set(['hold', 'tap', 'tap-repeat']);
    for (const [slug, policy] of Object.entries(IMMERSIVE_POLICY) as Array<[string, GameImmersivePolicy]>) {
      for (const [dir, cfg] of Object.entries(policy.dirs ?? {})) {
        expect(modes.has(cfg.mode), slug + ' ' + dir).toBe(true);
        expect(cfg.mapsTo.length).toBeGreaterThan(1);
      }
    }
  });
});

describe('playfield fit on phone frames', () => {
  it('keeps every declared logical size inside portrait and landscape frames', () => {
    for (const [slug, policy] of Object.entries(IMMERSIVE_POLICY)) {
      const logical = policy.logical;
      if (!logical) continue;
      for (const [vw, vh] of PHONE_FRAMES) {
        const availH = policy.layout === 'banded' ? Math.max(0, vh - 64) : vh;
        const fit = fitSize(logical.w, logical.h, vw, availH, true);
        expect(fit.width, slug + ` ${vw}x${vh}`).toBeGreaterThan(0);
        expect(fit.height).toBeGreaterThan(0);
        expect(fit.width).toBeLessThanOrEqual(vw + 0.5);
        expect(fit.height).toBeLessThanOrEqual(availH + 0.5);
        const scaleLimit = Math.min(vw / logical.w, availH / logical.h);
        expect(fit.scale).toBeCloseTo(Math.max(0, scaleLimit), 8);
      }
    }
  });
});
