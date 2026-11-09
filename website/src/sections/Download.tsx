import { useEffect, useState, type FormEvent } from 'react';
import { SCREENS, SITE } from '../config/site';
import { env, store } from '../scroll/store';
import { FAQ } from '../content';
import { DownloadButton, Phone, SectionHead, Sparkle } from '../components/ui';

function Waitlist() {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  if (!SITE.waitlistEndpoint) return <p className="muted" style={{ marginTop: 14 }}>A waitlist is coming. Check back soon.</p>;
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState('sending');
    try {
      const email = new FormData(e.currentTarget).get('email');
      const r = await fetch(SITE.waitlistEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      setState(r.ok ? 'done' : 'error');
    } catch { setState('error'); }
  };
  if (state === 'done') return <p style={{ marginTop: 14, color: 'var(--sage)' }}>You’re on the list. We’ll email you when iPhone is ready.</p>;
  return (
    <form onSubmit={submit}>
      <label className="sr-only" htmlFor="wl">Email</label>
      <input id="wl" name="email" type="email" required placeholder="you@email.com" />
      <button className="pill pill--gold pill--sm" disabled={state === 'sending'}>{state === 'sending' ? 'Joining…' : 'Join waitlist'}</button>
      {state === 'error' && <p style={{ color: 'var(--pink)', width: '100%', fontSize: 14 }}>That didn’t go through. Try again in a moment.</p>}
    </form>
  );
}

/** QR to the APK for desktop visitors (they'll install on their phone). */
function Qr() {
  const [src, setSrc] = useState('');
  useEffect(() => {
    if (env.touch) return;
    import('qrcode').then((q) => q.toDataURL(new URL(SITE.apk.url, location.href).href, { margin: 1, width: 240, color: { dark: '#17120D', light: '#E3C28D' } })).then(setSrc).catch(() => setSrc(''));
  }, []);
  if (!src) return null;
  return <figure className="qr"><img src={src} alt="QR code linking to the Streak APK download" width={120} height={120} /><figcaption>Scan with your Android phone</figcaption></figure>;
}

export function Download() {
  const hover = (v: number) => () => { store.dlHover = v; };
  return (
    <section className="sec" id="download" data-act="download">
      <div className="wrap">
        <div className="dl__card">
          <h2>Take your first step.</h2>
          <div className="dl__grid">
            <div>
              <div className="dl__cta" onPointerEnter={hover(1)} onPointerLeave={hover(0)} onFocus={hover(1)} onBlur={hover(0)}>
                <DownloadButton />
                <span className="burst" aria-hidden="true">{[0, 1, 2, 3, 4, 5].map((i) => <Sparkle key={i} size={12} />)}</span>
              </div>
              <ol className="steps">
                <li><span>Open the downloaded file.</span></li>
                <li><span>Allow <b>Install unknown apps</b> when Android asks.</span></li>
                <li><span>Tap <b>Install</b>.</span></li>
              </ol>
              <p className="dl__note">Android shows this prompt for every app installed outside the Play Store. It’s a one-time setting for your browser.</p>
              <div className="dl__row"><Qr /><div className="ios"><h3>iPhone</h3><p className="muted">Coming soon. It’s in development.</p><Waitlist /></div></div>
            </div>
            <div className="dl__phone"><Phone {...SCREENS.home} width={250} anchor="dl-phone" className="anchor-3d" /></div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section className="sec faq" id="faq">
      <div className="wrap">
        <SectionHead title="Questions" />
        <div className="faq__list">
          {FAQ.map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}
        </div>
      </div>
    </section>
  );
}

export function Final() {
  const links = Object.entries(SITE.links).filter(([, v]) => v);
  return (
    <>
      <section className="sec final" aria-labelledby="final-h">
        <div className="wrap"><h2 id="final-h">Keep your promises.</h2><DownloadButton /></div>
      </section>
      <footer className="footer">
        <div className="wrap footer__row">
          <span>© {new Date().getFullYear()} Streak</span>
          {links.length > 0 && <nav className="footer__links" aria-label="Footer">{links.map(([k, v]) => <a key={k} href={v}>{k[0].toUpperCase() + k.slice(1)}</a>)}</nav>}
          <span>Android v{SITE.apk.version} <Sparkle size={12} /> iPhone coming soon</span>
        </div>
        <div className="wordmark" aria-hidden="true" data-scrub data-start="top bottom" data-end="bottom bottom">Streak<Sparkle size={40} /></div>
      </footer>
    </>
  );
}
