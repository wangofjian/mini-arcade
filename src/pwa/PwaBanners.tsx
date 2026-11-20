import { useEffect, useState } from 'react';
import {
  INSTALL_DISMISS_KEY,
  isIosSafari,
  isStandaloneDisplay,
  shouldShowInstallPrompt,
  shouldShowUpdatePrompt,
  type PromptKind,
} from './promptPolicy';
import { requestSkipWaiting } from './register';

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> };

export function PwaBanners() {
  const [installKind, setInstallKind] = useState<PromptKind>('none');
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    const dismissed = window.localStorage.getItem(INSTALL_DISMISS_KEY) === '1';
    const standalone = isStandaloneDisplay({
      standaloneMedia: window.matchMedia('(display-mode: standalone)').matches,
      iosStandalone: Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
    });
    const iosSafari = isIosSafari(navigator.userAgent);
    setInstallKind(shouldShowInstallPrompt({ dismissed, standalone, canInstall: false, iosSafari }));

    const onPrompt = (event: Event) => {
      event.preventDefault();
      const ev = event as BeforeInstallPromptEvent;
      setInstallEvent(ev);
      const laterDismissed = window.localStorage.getItem(INSTALL_DISMISS_KEY) === '1';
      setInstallKind(
        shouldShowInstallPrompt({
          dismissed: laterDismissed,
          standalone,
          canInstall: true,
          iosSafari,
        }),
      );
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    let refresh: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;
        refresh = reg;
        if (reg.waiting) setWaiting(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaiting(reg.waiting ?? worker);
            }
          });
        });
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      void refresh;
    };
  }, []);

  const dismissInstall = () => {
    window.localStorage.setItem(INSTALL_DISMISS_KEY, '1');
    setInstallKind('none');
    setInstallEvent(null);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    setInstallEvent(null);
    setInstallKind('none');
  };

  const applyUpdate = () => {
    if (!waiting) return;
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
    requestSkipWaiting(waiting);
  };

  const showUpdate = shouldShowUpdatePrompt({ hasWaitingWorker: Boolean(waiting) });
  if (installKind === 'none' && !showUpdate) return null;

  return (
    <div className="pwa-banners" role="region" aria-label="安装与更新提示">
      {installKind === 'android-install' ? (
        <div className="pwa-banner">
          <p>可以把小游戏厅安装到主屏幕，离线也能打开大厅、玩单机游戏。</p>
          <div className="pwa-banner-actions">
            <button type="button" className="gc-btn gc-btn-primary" onClick={() => void install()}>
              安装
            </button>
            <button type="button" className="gc-btn" onClick={dismissInstall}>
              关闭
            </button>
          </div>
        </div>
      ) : null}
      {installKind === 'ios-add' ? (
        <div className="pwa-banner">
          <p>在 Safari 点分享按钮，再选择「添加到主屏幕」，即可安装小游戏厅。</p>
          <div className="pwa-banner-actions">
            <button type="button" className="gc-btn" onClick={dismissInstall}>
              关闭
            </button>
          </div>
        </div>
      ) : null}
      {showUpdate ? (
        <div className="pwa-banner">
          <p>有新版本，刷新即可使用。正在进行的对局不会被自动中断。</p>
          <div className="pwa-banner-actions">
            <button type="button" className="gc-btn gc-btn-primary" onClick={applyUpdate}>
              刷新即可
            </button>
            <button type="button" className="gc-btn" onClick={() => setWaiting(null)}>
              关闭
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
