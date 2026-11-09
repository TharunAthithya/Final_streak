import { SCREENS } from '../config/site';
import { PINGS } from '../content';
import { Phone, ProgressRing, SectionHead } from '../components/ui';

export function Rooms() {
  return (
    <section className="sec" id="rooms" data-act="rooms">
      <div className="wrap">
        <SectionHead title="Never do it alone">Make a room for your running group, study gang or 30-day challenge. Invite friends by @username or a 6-character code, pick the habits the room tracks, and see who has shown up today.</SectionHead>
        <div className="rooms__grid" data-scrub data-start="top 80%" data-end="center 45%">
          <div>
            <div className="rooms__ring"><ProgressRing size={128} /><span><b>Morning Runners</b><br /><span className="muted">Today’s progress</span></span></div>
            <div className="pings">
              {PINGS.map((p, i) => (
                <div className="ping" key={p.name} style={{ ['--i' as string]: i }}><span className="avatar" style={{ background: p.color }}>{p.name[0]}</span><span><b>{p.name}</b> completed {p.habit}</span></div>
              ))}
            </div>
            <p className="demo-note">Example activity, not real users.</p>
          </div>
          <Phone {...SCREENS.rooms} width={300} anchor="rooms-phone" />
        </div>
      </div>
    </section>
  );
}
