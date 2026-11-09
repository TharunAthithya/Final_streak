import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { SCREENS } from '../config/site';
import { MOTION } from '../config/motion';
import { env, store } from '../scroll/store';

const StairsCanvas = lazy(() => import('../three/stairs/StairsCanvas'));
const STORY = 'A climber starts at the bottom of a staircase, one step for every kept day. Halfway up they pause, unsure about the next step, then look back and see how many steps are already behind them. They turn forward, take the next step, and keep climbing.';
const DAYS = 42;

/** Mirrors the app's Streak Grid dots; fills one day per step climbed. */
function LiveGrid() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0, last = -1;
    import('../three/stairs/StairsCanvas').then(({ storyAt }) => {
      const tick = () => {
        const n = Math.floor(storyAt(store.p.stairs ?? 0).steps);
        if (n !== last && ref.current) {
          last = n;
          ref.current.querySelectorAll('i').forEach((c, i) => c.className = i < n ? 'kept' : i === n ? 'today' : '');
          ref.current.querySelector('.grid__day')!.textContent = `Day ${n + 1}`;
        }
        raf = requestAnimationFrame(tick);
      };
      tick();
    });
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="grid-panel" ref={ref} aria-hidden="true">
      <div className="grid-panel__head"><span className="label">Streak Grid</span><b className="grid__day">Day 1</b></div>
      <div className="grid-panel__dots">{Array.from({ length: DAYS }, (_, i) => <i key={i} />)}</div>
    </div>
  );
}

/** Signature section (Appendix A). Cinematic when WebGL + motion are available; otherwise a static, complete story. */
export function Stairs() {
  const cinematic = env.use3D;
  const pin = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  useEffect(() => {
    const sec = pin.current?.parentElement;
    if (!sec) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { rootMargin: '100% 0px' });
    io.observe(sec);
    return () => io.disconnect();
  }, []);

  if (!cinematic) {
    return (
      <section className="stairs stairs--static" aria-labelledby="stairs-h">
        <div className="wrap">
          <div className="stairs__lines"><h2 id="stairs-h">Look how far you’ve come.</h2><h2>Now keep going.</h2></div>
          <div className="stairs__grid"><img src={SCREENS.grid.src} alt={SCREENS.grid.alt} loading="lazy" /></div>
          <p className="stairs__story">{STORY}</p>
        </div>
      </section>
    );
  }
  return (
    <section className="stairs" data-act="stairs" data-pinned style={{ height: `${MOTION.stairs.sectionHeightVh}vh` }} aria-labelledby="stairs-h">
      <div className="stairs__pin" ref={pin}>
        <div className="stairs__canvas" aria-hidden="true">
          {onScreen && <Suspense fallback={null}><StairsCanvas /></Suspense>}
        </div>
        <div className="stairs__scrim" aria-hidden="true" />
        <LiveGrid />
        <div className="stairs__text">
          <h2 id="stairs-h" className="t-look">Look how far you’ve come.</h2>
          <h2 className="t-keep">Now keep going.</h2>
        </div>
        <p className="sr-only">{STORY}</p>
      </div>
    </section>
  );
}
