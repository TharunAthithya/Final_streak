import { useEffect, useState } from 'react';
import { DownloadButton } from '../components/ui';

const LINKS = [['Why Streak', '#why'], ['Features', '#features'], ['Rooms', '#rooms'], ['Download', '#download'], ['FAQ', '#faq']];

/** Sticky glass nav: hides on scroll down, returns on scroll up. */
export function Nav() {
  const [hidden, setHidden] = useState(false);
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setSolid(y > 20);
      setHidden(y > last && y > 300);
      last = y;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <header className={`nav${hidden && !open ? ' is-hidden' : ''}${solid ? ' is-solid' : ''}`}>
      <div className="wrap nav__bar">
        <a className="brand" href="#top"><span className="brand__mark" aria-hidden="true">S</span>Streak</a>
        <nav className="nav__links" aria-label="Main">{LINKS.map(([t, h]) => <a key={h} href={h}>{t}</a>)}</nav>
        <DownloadButton small />
        <button className="nav__menu-btn" aria-expanded={open} aria-controls="menu" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Menu'}</button>
      </div>
      {open && (
        <nav id="menu" className="nav__sheet" aria-label="Mobile">
          {LINKS.map(([t, h]) => <a key={h} href={h} onClick={() => setOpen(false)}>{t}</a>)}
        </nav>
      )}
    </header>
  );
}
