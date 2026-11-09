import { useEffect, useRef, useState } from 'react';
import { BELIEFS, STATEMENT } from '../content';
import { useLineIndex } from '../components/hooks';

/** Words light up from muted to cream as the sentence crosses the viewport. Phase 2 moves this onto the shared scroll store. */
export function Statement() {
  const ref = useRef<HTMLParagraphElement>(null);
  const words = STATEMENT.split(' ');
  const [lit, setLit] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const p = Math.min(1, Math.max(0, (window.innerHeight * 0.85 - r.top) / (r.height + window.innerHeight * 0.4)));
      setLit(Math.round(p * words.length));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [words.length]);
  return (
    <section className="sec statement" id="why" data-act="statement">
      <div className="wrap">
        <p ref={ref} aria-label={STATEMENT}>
          {words.map((w, i) => <span key={i} aria-hidden="true" className={`w${i < lit ? ' on' : ''}`}>{w} </span>)}
        </p>
      </div>
    </section>
  );
}

export function Beliefs() {
  const ref = useRef<HTMLDivElement>(null);
  const active = useLineIndex(ref, '.belief', 2 / 3); // highlights once a belief is a third of the way up the screen
  return (
    <section className="sec beliefs" data-act="beliefs" aria-labelledby="beliefs-h">
      <div className="wrap">
        <div className="sec__head">
          <h2 id="beliefs-h">Streak believes in</h2>
          {/* 3D tokens morph here: one tile → a ring of friends → a rising staircase */}
          <div className="beliefs__art" data-anchor="beliefs-art" aria-hidden="true" />
        </div>
        <div className="beliefs__list" ref={ref}>
          {BELIEFS.map((b, i) => (
            <article className={`belief${i === active ? ' is-active' : ''}`} key={b.title}><h3>{b.title}</h3><p>{b.body}</p></article>
          ))}
        </div>
      </div>
    </section>
  );
}
