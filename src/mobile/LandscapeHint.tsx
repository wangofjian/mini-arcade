import { useEffect, useState } from 'react';

/** Shown when the viewport is short and wide. Does not block play, and does not tell people to use a computer. */
export function LandscapeHint() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setShow(w > h && h < 500);
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);
  if (!show) return null;
  return (
    <p className="landscape-hint" role="note">
      现在是横屏，画面比较扁，街机按键可能会挤在一起。转到竖屏通常更顺手；双人乒乓也可以继续横着玩，左右半场分别拖动挡板。不必换到电脑。
    </p>
  );
}
