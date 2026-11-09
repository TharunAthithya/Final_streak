import type { ReactNode } from 'react';
import { SITE } from '../config/site';

/** Four-point gold sparkle — the brand's signature mark. */
export const Sparkle = ({ size = 18 }: { size?: number }) => (
  <svg className="sparkle" width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
    <path fill="currentColor" d="M10 0c.8 5.6 4.4 9.2 10 10-5.6.8-9.2 4.4-10 10-.8-5.6-4.4-9.2-10-10 5.6-.8 9.2-4.4 10-10z" />
  </svg>
);

const AndroidIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.6 9.48l1.84-3.18a.38.38 0 0 0-.66-.38l-1.86 3.22A11.4 11.4 0 0 0 12 8.08c-1.78 0-3.46.38-4.92 1.06L5.22 5.92a.38.38 0 0 0-.66.38L6.4 9.48A10.8 10.8 0 0 0 1 18h22a10.8 10.8 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z"/></svg>
);
const AppleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.8 1.2 1.8 2.6 3.1 2.6 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8 0 0-2.6-1-2.6-4.3zM13.9 5c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.6 2.8-1.4z"/></svg>
);

/** Primary download pill. Meta line shows version (+ size / min Android when configured). */
export function DownloadButton({ small = false }: { small?: boolean }) {
  const meta = [`v${SITE.apk.version}`, SITE.apk.sizeLabel, SITE.apk.minAndroid].filter(Boolean).join(' • ');
  return (
    <a className={`pill pill--gold${small ? ' pill--sm' : ''}`} href={SITE.apk.url} download>
      <AndroidIcon />
      <span>Download for Android{!small && <small>APK {meta}</small>}</span>
    </a>
  );
}

export const IosPill = () => (
  <span className="pill pill--ghost" aria-disabled="true">
    <AppleIcon />
    <span>iPhone<small>Coming soon</small></span>
  </span>
);

/** Phone mockup. `width` in px; the image is a real screenshot dropped into /public/screens. */
export const Phone = ({ src, alt, width = 300, className = '', anchor }: { src: string; alt: string; width?: number; className?: string; anchor?: string }) => (
  <div className={`phone ${className}`} data-anchor={anchor} style={{ ['--pw' as string]: `${width}px` }}>
    <img src={src} alt={alt} loading="lazy" decoding="async" />
  </div>
);

export function Marquee({ items }: { items: string[] }) {
  const run = items.map((w) => <span key={w}>{w}<Sparkle /></span>);
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">{run}{run.map((r, i) => <span key={`b${i}`}>{items[i]}<Sparkle /></span>)}</div>
    </div>
  );
}

export const SectionHead = ({ title, children }: { title: ReactNode; children?: ReactNode }) => (
  <div className="sec__head"><h2>{title}</h2>{children && <p>{children}</p>}</div>
);

/** Rolling-digit counter: each digit is a 0–9 column that slides into place when `active`. */
export function RollingNumber({ value, active }: { value: number; active: boolean }) {
  return (
    <span className="roll" aria-label={String(value)}>
      {String(value).split('').map((d, i) => (
        <span className="roll__col" key={i} aria-hidden="true">
          <span className="roll__strip" style={{ transform: `translateY(${active ? -Number(d) * 10 : 0}%)`, transitionDelay: `${i * 90}ms` }}>
            {'0123456789'.split('').map((n) => <span key={n}>{n}</span>)}
          </span>
        </span>
      ))}
    </span>
  );
}

/** Gold progress ring; fill driven by the CSS var --p of the nearest [data-scrub] ancestor. */
export const ProgressRing = ({ size = 120 }: { size?: number }) => (
  <svg className="ring" width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="50" r="42" pathLength="100" className="ring__track" />
    <circle cx="50" cy="50" r="42" pathLength="100" className="ring__val" />
  </svg>
);
