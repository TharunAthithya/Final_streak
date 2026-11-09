import { useEffect, useRef } from 'react';
import { TOUR } from '../content';
import { Phone, RollingNumber } from '../components/ui';
import { useNearestCenter } from '../components/hooks';
import { store } from '../scroll/store';

/** Pinned product tour: the (3D) phone stays put while steps scroll past; its screen follows the active step. */
export function Tour() {
  const ref = useRef<HTMLDivElement>(null);
  const active = useNearestCenter(ref, '.tour__copy');
  useEffect(() => { store.tourStep = active; }, [active]);
  const step = TOUR[active];
  return (
    <section className="sec" id="features" data-act="tour" aria-label="Product tour">
      <div className="wrap tour__grid" ref={ref}>
        <div>
          {TOUR.map((s, i) => (
            <article key={s.key} className={`tour__step${i === active ? ' is-active' : ''}`}>
              <div className="tour__copy">
              <span className="label">{String(i + 1).padStart(2, '0')} / {s.label}</span>
              <h3>{s.title}</h3>
              {s.stat && <p className="tour__stat"><RollingNumber value={s.stat.value} active={i === active} />{s.stat.suffix}</p>}
              <p>{s.body}</p>
              </div>
              <Phone {...s.screen} />
            </article>
          ))}
        </div>
        <div className="tour__sticky" aria-hidden="true"><Phone key={step.key} {...step.screen} width={320} anchor="tour-phone" className="anchor-3d" /></div>
      </div>
    </section>
  );
}
