import { SCREENS, SITE } from '../config/site';
import { MARQUEE } from '../content';
import { DownloadButton, IosPill, Marquee, Phone, Sparkle } from '../components/ui';

const LINES = ['Keep your', 'promises.', 'Keep your', 'streak.'];

export function Hero() {
  return (
    <>
      <section className="hero" id="top" data-act="hero" aria-label={SITE.tagline}>
        <div className="hero__sparkles" aria-hidden="true">{[0, 1, 2, 3, 4, 5].map((i) => <Sparkle key={i} size={10 + (i % 3) * 6} />)}</div>
        <div className="wrap hero__grid">
          <div>
            <h1 aria-label={SITE.tagline}>
              {LINES.map((l, i) => <span className="line" key={i} aria-hidden="true"><span>{l}</span></span>)}
            </h1>
            <p className="hero__sub">Streak is a habit app for people who keep starting over. Make one small promise to yourself each day, check it off, and bring friends into a room so you’re never doing it alone.</p>
            <div className="hero__ctas"><DownloadButton /><IosPill /></div>
          </div>
                    <Phone className="hero__phone anchor-3d" anchor="hero-phone" width={300} {...SCREENS.home} />
        </div>
        <div className="wrap scroll-cue" aria-hidden="true"><i /><span className="cue-mouse">Scroll to explore</span><span className="cue-touch">Swipe to explore</span></div>
      </section>
      <Marquee items={MARQUEE} />
    </>
  );
}
