import { useEffect, useRef } from 'react';
import { env, store } from '../scroll/store';
import { GALLERY, PRINCIPLES } from '../content';
import { Phone, SectionHead } from '../components/ui';

export function Principles() {
  return (
    <section className="sec" data-act="principles" aria-labelledby="principles-h">
      <div className="wrap">
        <SectionHead title={<span id="principles-h">How Streak works for you</span>} />
        <ol className="principles__list">
          {PRINCIPLES.map((p, i) => (
            <li className="principle" key={p.title} data-scrub data-start="top 92%" data-end="top 60%">
              <span className="principle__n">{String(i + 1).padStart(2, '0')}</span>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** 3D curved carousel (CSS 3D, so screenshots stay real, accessible <img>s). Scroll rotates it; drag to spin. */
export function Gallery() {
  const ring = useRef<HTMLDivElement>(null);
  const drag = useRef({ on: false, x: 0, offset: 0 });
  const n = GALLERY.length, step = 360 / n;
  useEffect(() => {
    if (env.reduced) return;
    let raf = 0, last = -1, shown = 0, prev = performance.now();
    const tick = (now = performance.now()) => {
      const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
      const raw = -((store.p.gallery ?? 0) - 0.2) * 360 * 0.9 + drag.current.offset;
      // Ease toward the nearest screen so one phone always rests front and centre (no half-turned phones on small screens).
      const target = drag.current.on ? raw : Math.round(raw / step) * step;
      shown += (target - shown) * (1 - Math.exp(-6 * dt));
      if (ring.current) {
        ring.current.style.transform = `translateZ(calc(var(--r) * -1)) rotateY(${shown}deg)`;
        const active = ((Math.round(-shown / step) % n) + n) % n;
        if (active !== last) { last = active; ring.current.querySelectorAll('.gallery__item').forEach((el, i) => el.classList.toggle('is-active', i === active)); }
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [n, step]);
  const down = (e: React.PointerEvent) => { drag.current.on = true; drag.current.x = e.clientX; (e.target as Element).setPointerCapture?.(e.pointerId); };
  const move = (e: React.PointerEvent) => { if (!drag.current.on) return; drag.current.offset += (e.clientX - drag.current.x) * 0.25; drag.current.x = e.clientX; };
  const up = () => { drag.current.on = false; };
  return (
    <section className="sec gallery" data-act="gallery" aria-labelledby="gallery-h">
      <div className="wrap"><SectionHead title={<span id="gallery-h">Inside the app</span>}>Scroll or drag to turn.</SectionHead></div>
      <div className="carousel" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <div className="carousel__ring" ref={ring} style={{ ['--n' as string]: n }}>
          {GALLERY.map((g, i) => (
            <figure className="gallery__item" key={g.label} style={{ ['--a' as string]: `${i * step}deg` }}>
              <Phone {...g.screen} width={230} /><figcaption>{g.label}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
