import { lazy, Suspense } from 'react';
import { Nav } from './sections/Nav';
import { Hero } from './sections/Hero';
import { Beliefs, Statement } from './sections/Story';
import { Tour } from './sections/Tour';
import { Rooms } from './sections/Rooms';
import { Stairs } from './sections/Stairs';
import { Gallery, Principles } from './sections/Principles';
import { Download, Faq, Final } from './sections/Download';
import { Flourishes, Preloader } from './components/Chrome';
import { SmoothScroll } from './scroll/SmoothScroll';
import { env } from './scroll/store';

const MainCanvas = lazy(() => import('./three/MainCanvas'));
if (env.use3D) document.documentElement.classList.add('is-3d');

/** Section order follows the master build prompt (5.0 – 5.12). */
export default function App() {
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <Preloader />
      <div className="atmos" aria-hidden="true" />
      {env.use3D && <Suspense fallback={null}><MainCanvas /></Suspense>}
      <div className="grain" aria-hidden="true" />
      <Flourishes />
      <Nav />
      <main id="main">
        <Hero />
        <Statement />
        <Beliefs />
        <Tour />
        <Rooms />
        <Stairs />
        <Principles />
        <Gallery />
        <Download />
        <Faq />
      </main>
      <Final />
      <SmoothScroll />
    </>
  );
}
