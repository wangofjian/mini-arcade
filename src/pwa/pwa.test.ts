import { describe, expect, it } from 'vitest';
import {
  FALLBACK_DOC,
  cacheNameFor,
  isApiOrWebSocket,
  isApiPath,
  planFetch,
  renderServiceWorker,
  selectPrecacheUrls,
  shouldPrecachePath,
  toPrecacheUrl,
} from './swPolicy';
import { isIosSafari, isStandaloneDisplay, shouldShowInstallPrompt, shouldShowUpdatePrompt } from './promptPolicy';

describe('PWA 预缓存范围', () => {
  it('预缓存大厅文档、hashed 资产、manifest 与图标，排除 SW 与 source map', () => {
    expect(shouldPrecachePath('/index.html')).toBe(true);
    expect(shouldPrecachePath('/')).toBe(true);
    expect(shouldPrecachePath('/assets/index-abc.js')).toBe(true);
    expect(shouldPrecachePath('/assets/index-abc.css')).toBe(true);
    expect(shouldPrecachePath('/manifest.webmanifest')).toBe(true);
    expect(shouldPrecachePath('/apple-touch-icon.png')).toBe(true);
    expect(shouldPrecachePath('/icons/icon-192.png')).toBe(true);
    expect(shouldPrecachePath('/icons/icon-512-maskable.png')).toBe(true);
    expect(shouldPrecachePath('/sw.js')).toBe(false);
    expect(shouldPrecachePath('/assets/index-abc.js.map')).toBe(false);
  });

  it('从构建产物列表选出 URL，并始终带上离线回退文档', () => {
    const urls = selectPrecacheUrls([
      'index.html',
      'assets/index-abc.js',
      'assets/index-abc.js.map',
      'manifest.webmanifest',
      'sw.js',
      'icons/icon-192.png',
    ]);
    expect(urls).toEqual([
      '/assets/index-abc.js',
      '/icons/icon-192.png',
      '/index.html',
      '/manifest.webmanifest',
    ]);
    expect(toPrecacheUrl('index.html')).toBe(FALLBACK_DOC);
  });
});

describe('PWA 不缓存 /api 与 WebSocket', () => {
  it('识别 /api/* 路径', () => {
    expect(isApiPath('/api/tetris-vs/rooms')).toBe(true);
    expect(isApiPath('/api/gomoku-vs/ws')).toBe(true);
    expect(isApiPath('/api')).toBe(true);
    expect(isApiPath('/games/tetris-vs')).toBe(false);
    expect(isApiPath('/sw.js')).toBe(false);
  });

  it('/api 与 WebSocket 升级走网络且不进入缓存计划', () => {
    expect(planFetch({ method: 'GET', pathname: '/api/tetris-vs/rooms' })).toBe('bypass');
    expect(planFetch({ method: 'POST', pathname: '/api/tetris-vs/rooms' })).toBe('bypass');
    expect(planFetch({ method: 'GET', pathname: '/games/gomoku-vs', upgrade: 'websocket' })).toBe('bypass');
    expect(isApiOrWebSocket({ method: 'GET', pathname: '/', upgrade: 'WebSocket' })).toBe(true);
  });
});

describe('PWA 导航回退与生成脚本', () => {
  it('导航请求离线回退到缓存的 index.html，普通 GET 走 cache-first', () => {
    expect(planFetch({ method: 'GET', pathname: '/games/tetris', mode: 'navigate' })).toBe('navigate');
    expect(planFetch({ method: 'GET', pathname: '/games/tetris-vs', destination: 'document' })).toBe('navigate');
    expect(planFetch({ method: 'GET', pathname: '/assets/index-abc.js' })).toBe('cache-first');
    expect(planFetch({ method: 'HEAD', pathname: '/' })).toBe('bypass');
  });

  it('生成的 SW 预缓存列表正确，并对 /api 与 WS 直接放行、不用成功响应写入缓存', () => {
    const body = renderServiceWorker('abc123', ['/index.html', '/assets/app.js']);
    expect(cacheNameFor('abc123')).toBe('mini-arcade-abc123');
    expect(body).toContain('/index.html');
    expect(body).toContain('/assets/app.js');
    expect(body).toContain("path === '/api' || path.startsWith('/api/')");
    expect(body).toContain("upgrade.trim().toLowerCase() === 'websocket'");
    expect(body).toContain('cache.match(FALLBACK_DOC)');
    expect(body).not.toContain('cache.put');
    expect(body).toContain("event.data === 'SKIP_WAITING'");
    const installBlock = body.slice(body.indexOf("addEventListener('install'"), body.indexOf("addEventListener('activate'"));
    const messageBlock = body.slice(body.indexOf("addEventListener('message'"));
    expect(installBlock).not.toContain('skipWaiting');
    expect(messageBlock).toContain("event.data === 'SKIP_WAITING'");
    expect(messageBlock).toContain('self.skipWaiting()');
  });
});

describe('安装与更新提示策略', () => {
  it('可关闭：已关闭或已在主屏幕时不再提示安装', () => {
    expect(shouldShowInstallPrompt({ dismissed: true, standalone: false, canInstall: true, iosSafari: true })).toBe('none');
    expect(shouldShowInstallPrompt({ dismissed: false, standalone: true, canInstall: true, iosSafari: true })).toBe('none');
    expect(shouldShowInstallPrompt({ dismissed: false, standalone: false, canInstall: true, iosSafari: false })).toBe('android-install');
    expect(shouldShowInstallPrompt({ dismissed: false, standalone: false, canInstall: false, iosSafari: true })).toBe('ios-add');
  });

  it('识别 iOS Safari 与 standalone，更新提示仅在有等待中的 SW 时出现', () => {
    expect(isIosSafari('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')).toBe(true);
    expect(isIosSafari('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1')).toBe(false);
    expect(isStandaloneDisplay({ standaloneMedia: true, iosStandalone: false })).toBe(true);
    expect(shouldShowUpdatePrompt({ hasWaitingWorker: true })).toBe(true);
    expect(shouldShowUpdatePrompt({ hasWaitingWorker: false })).toBe(false);
  });
});
