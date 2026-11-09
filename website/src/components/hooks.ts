import { useEffect, useState, type RefObject } from 'react';

/** Index of the child (matched by selector) currently nearest the viewport centre. */
export function useActiveIndex(ref: RefObject<HTMLElement | null>, selector: string) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const els = ref.current ? Array.from(ref.current.querySelectorAll<HTMLElement>(selector)) : [];
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(els.indexOf(e.target as HTMLElement))),
      { rootMargin: '-45% 0px -45% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ref, selector]);
  return active;
}

/** Index of the element whose centre is nearest the viewport centre (switches at the midpoint between two blocks). */
export function useNearestCenter(ref: RefObject<HTMLElement | null>, selector: string) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const els = ref.current ? Array.from(ref.current.querySelectorAll<HTMLElement>(selector)) : [];
      let best = 0, bestD = Infinity;
      els.forEach((el, i) => { const r = el.getBoundingClientRect(); const d = Math.abs(r.top + r.height / 2 - innerHeight / 2); if (d < bestD) { bestD = d; best = i; } });
      setActive(best);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    addEventListener('scroll', onScroll, { passive: true });
    return () => { removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [ref, selector]);
  return active;
}

/** Index of the last element whose top has risen above `line` (fraction of viewport height from the top). */
export function useLineIndex(ref: RefObject<HTMLElement | null>, selector: string, line: number) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const els = ref.current ? Array.from(ref.current.querySelectorAll<HTMLElement>(selector)) : [];
      let idx = 0;
      els.forEach((el, i) => { if (el.getBoundingClientRect().top < innerHeight * line) idx = i; });
      setActive(idx);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    return () => { removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, [ref, selector, line]);
  return active;
}
