import { useEffect, useState } from 'react';
import { env } from '../scroll/store';

/** ≤1.5 s brand preloader: gold "S" + thin progress line. Never blocks longer than that. */
export function Preloader() {
  const [state, setState] = useState<'on' | 'out' | 'off'>(env.reduced ? 'off' : 'on');
  useEffect(() => {
    if (state !== 'on') return;
    const done = () => { setState('out'); setTimeout(() => setState('off'), 700); };
    const t = setTimeout(done, 1500);
    Promise.all([document.fonts?.ready, new Promise((r) => (document.readyState === 'complete' ? r(0) : addEventListener('load', r, { once: true })))]).then(() => setTimeout(done, 300));
    return () => clearTimeout(t);
  }, [state]);
  if (state === 'off') return null;
  return (
    <div className={`preloader${state === 'out' ? ' is-out' : ''}`} aria-hidden="true">
      <span className="brand__mark preloader__mark">S</span>
      <i className="preloader__line" />
    </div>
  );
}

/** Desktop-only flourishes: cursor spotlight + magnetic primary buttons. */
export function Flourishes() {
  useEffect(() => {
    if (env.touch || env.reduced) return;
    const pills = Array.from(document.querySelectorAll<HTMLElement>('.pill--gold'));
    const move = (e: PointerEvent) => {
      const el = e.currentTarget as HTMLElement, r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.25}px)`;
    };
    const leave = (e: PointerEvent) => { (e.currentTarget as HTMLElement).style.transform = ''; };
    pills.forEach((p) => { p.addEventListener('pointermove', move); p.addEventListener('pointerleave', leave); });
    return () => pills.forEach((p) => { p.removeEventListener('pointermove', move); p.removeEventListener('pointerleave', leave); });
  }, []);
  return <><div className="progress" aria-hidden="true" />{!env.touch && <div className="spotlight" aria-hidden="true" />}</>;
}
