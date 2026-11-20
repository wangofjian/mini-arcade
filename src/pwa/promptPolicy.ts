export const INSTALL_DISMISS_KEY = 'mini-arcade-pwa-install-dismissed';

export type PromptKind = 'none' | 'android-install' | 'ios-add' | 'update';

export function isStandaloneDisplay(input: {
  standaloneMedia?: boolean;
  iosStandalone?: boolean;
}): boolean {
  return Boolean(input.standaloneMedia || input.iosStandalone);
}

export function isIosSafari(userAgent: string): boolean {
  const ua = userAgent;
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && /Mobile/i.test(ua));
  if (!ios) return false;
  if (/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Firefox|Edg|OPR/i.test(ua) && !/Safari/i.test(ua)) return false;
  // Chrome/Firefox/Edge on iOS include CriOS/FxiOS/EdgiOS; Safari includes Safari and Version.
  if (/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua)) return false;
  return /Safari/i.test(ua);
}

export function shouldShowInstallPrompt(input: {
  dismissed: boolean;
  standalone: boolean;
  canInstall: boolean;
  iosSafari: boolean;
}): PromptKind {
  if (input.dismissed || input.standalone) return 'none';
  if (input.canInstall) return 'android-install';
  if (input.iosSafari) return 'ios-add';
  return 'none';
}

export function shouldShowUpdatePrompt(input: { hasWaitingWorker: boolean }): boolean {
  return input.hasWaitingWorker;
}
