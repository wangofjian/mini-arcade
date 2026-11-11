export type HoldSessionOptions = {
  onDown?: () => void;
  onUp?: () => void;
  /** Called once after repeatDelayMs, then every repeatEveryMs, while held. */
  onRepeat?: () => void;
  /** If provided, consulted at press time; otherwise onRepeat presence decides. */
  wantRepeat?: () => boolean;
  repeatDelayMs?: number;
  repeatEveryMs?: number;
  now?: () => number;
  schedule?: (fn: () => void, ms: number) => number;
  cancel?: (id: number) => void;
};

/**
 * Pointer-hold session used by on-screen controls.
 * Tracks a single pointer id, fires down/up once, and optionally auto-repeats.
 * Always call dispose() on unmount.
 */
export function createHoldSession(opts: HoldSessionOptions = {}) {
  const schedule = opts.schedule ?? ((fn, ms) => setTimeout(fn, ms) as unknown as number);
  const cancel = opts.cancel ?? ((id) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>));

  let down = false;
  let pointerId: number | null = null;
  let delayId: number | null = null;
  let intervalId: number | null = null;

  function clearTimers() {
    if (delayId !== null) {
      cancel(delayId);
      delayId = null;
    }
    if (intervalId !== null) {
      cancel(intervalId);
      intervalId = null;
    }
  }

  function startRepeat() {
    const enabled = opts.wantRepeat ? opts.wantRepeat() : !!opts.onRepeat;
    if (!enabled || !opts.onRepeat) return;

    const delayMs = opts.repeatDelayMs ?? 280;
    const everyMs = opts.repeatEveryMs ?? 80;
    delayId = schedule(() => {
      delayId = null;
      if (!down) return;
      opts.onRepeat?.();
      const tick = () => {
        if (!down) return;
        opts.onRepeat?.();
        intervalId = schedule(tick, opts.repeatEveryMs ?? everyMs);
      };
      intervalId = schedule(tick, everyMs);
    }, delayMs);
  }

  function press(id: number) {
    if (down) release();
    down = true;
    pointerId = id;
    opts.onDown?.();
    startRepeat();
  }

  function release(id?: number) {
    if (!down) return;
    if (id !== undefined && pointerId !== null && id !== pointerId) return;
    down = false;
    pointerId = null;
    clearTimers();
    opts.onUp?.();
  }

  function dispose() {
    if (down) release();
    else clearTimers();
  }

  return {
    press,
    release,
    dispose,
    isHeld: () => down,
    pointerId: () => pointerId,
  };
}
