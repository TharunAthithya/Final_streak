import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { env, store } from './store';

gsap.registerPlugin(ScrollTrigger);

/**
 * One scroll system: Lenis drives the window scroll on GSAP's ticker; ScrollTrigger writes
 *  - store.p[name] for every [data-act="name"] section (top enters bottom → bottom leaves top)
 *  - a CSS var --p (0–1) on every [data-scrub] element for DOM reveals
 */
export function SmoothScroll() {
  useEffect(() => {
    let lenis: Lenis | null = null;
    if (!env.reduced) {
      lenis = new Lenis({ lerp: 0.1, anchors: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis!.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }
    const triggers: ScrollTrigger[] = [];
    document.querySelectorAll<HTMLElement>('[data-act]').forEach((el) => {
      const name = el.dataset.act!;
      const pinned = el.dataset.pinned !== undefined; // sticky sections: progress over the pinned range
      triggers.push(ScrollTrigger.create({
        trigger: el,
        start: pinned ? 'top top' : 'top bottom',
        end: pinned ? 'bottom bottom' : 'bottom top',
        onUpdate: (s) => { store.p[name] = s.progress; el.style.setProperty('--act', s.progress.toFixed(4)); },
      }));
    });
    document.querySelectorAll<HTMLElement>('[data-scrub]').forEach((el) => {
      if (env.reduced) { el.style.setProperty('--p', '1'); return; }
      triggers.push(ScrollTrigger.create({
        trigger: el,
        start: el.dataset.start ?? 'top 88%',
        end: el.dataset.end ?? 'top 35%',
        onUpdate: (s) => el.style.setProperty('--p', s.progress.toFixed(3)),
      }));
    });
    const bar = document.querySelector<HTMLElement>('.progress');
    triggers.push(ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => bar?.style.setProperty('transform', `scaleX(${s.progress})`) }));
    const onMove = (e: PointerEvent) => {
      store.pointer.x = (e.clientX / innerWidth) * 2 - 1;
      store.pointer.y = -((e.clientY / innerHeight) * 2 - 1);
      document.documentElement.style.setProperty('--mx', `${e.clientX}px`);
      document.documentElement.style.setProperty('--my', `${e.clientY}px`);
    };
    addEventListener('pointermove', onMove, { passive: true });
    // Fonts/images change layout after first paint.
    const refresh = () => ScrollTrigger.refresh();
    addEventListener('load', refresh);
    document.fonts?.ready.then(refresh);
    return () => { triggers.forEach((t) => t.kill()); lenis?.destroy(); removeEventListener('pointermove', onMove); removeEventListener('load', refresh); };
  }, []);
  return null;
}
