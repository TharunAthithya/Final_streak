import { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft, ChevronRight, X, Copy, Check, Send,
  Flame, Heart, ThumbsUp, AtSign, CheckCheck
} from 'lucide-react';

/* ---------- Design tokens ---------- */
const C = {
  bg: '#0B0B0C',
  card: '#181513',
  bubbleOther: '#1B1714',
  bubbleOwn: '#2A2013',
  cardBorder: '#2B2521',
  dashed: '#453C34',
  gold: '#E8C08A',
  goldSoft: '#3A2E1F',
  goldDeep: '#8C6B3F',
  ink: '#F5F2EC',
  sub: '#9C958C',
  faint: '#65605A',
  heart: '#E8899A',
  fire: '#E8A05A',
  thumb: '#8FBF9E',
};

const DISPLAY = "'Baloo 2', sans-serif";
const BODY = "'Inter', sans-serif";

const MEMBERS = [
  { name: 'Aditi', subtitle: 'Room creator · here since day one', active: false, you: false },
  { name: 'You', subtitle: 'Here since day one', active: false, you: true },
  { name: 'Rahul', subtitle: 'Here since day one', active: true, you: false },
  { name: 'Meera', subtitle: 'Joined Sat, 18 Jul', active: false, you: false },
  { name: 'Kabir', subtitle: 'Joined Tue, 21 Jul', active: false, you: false },
];

const AVATARS = {
  Aditi: { mark: 'A', color: '#E8C08A' },
  Rahul: { mark: 'R', color: '#E8899A' },
  Meera: { mark: 'M', color: '#B2A4E8' },
  Kabir: { mark: 'K', color: '#8FBF9E' },
  You: { mark: 'Y', color: '#8FBF9E' },
};

/* ---------- Seed timeline, oldest -> newest ---------- */
const raw = [
  { kind: 'origin', label: "Room created · Fri, 17 Jul" },
  { kind: 'date', label: 'Fri, 17 Jul' },
  { kind: 'msg', name: 'Aditi', habit: 'Set up the dev environment', time: '9:12 AM',
    reactions: { heart: { count: 1, active: false }, fire: { count: 2, active: false }, thumb: { count: 0, active: false } } },
  { kind: 'msg', name: 'Rahul', habit: 'Completed the HTML/CSS refresher', time: '6:40 PM',
    reactions: { heart: { count: 0, active: false }, fire: { count: 1, active: false }, thumb: { count: 1, active: false } } },

  { kind: 'date', label: 'Sat, 18 Jul' },
  { kind: 'msg', name: 'Aditi', habit: 'Solved 2 array problems on LeetCode', time: '10:05 AM',
    reactions: { heart: { count: 2, active: false }, fire: { count: 3, active: true }, thumb: { count: 0, active: false } } },
  { kind: 'join', name: 'Meera', time: '2:30 PM' },
  { kind: 'msg', name: 'Meera', habit: 'Watched a 20 min JS tutorial', time: '4:20 PM',
    reactions: { heart: { count: 3, active: false }, fire: { count: 0, active: false }, thumb: { count: 1, active: false } } },

  { kind: 'date', label: 'Sun, 19 Jul' },
  { kind: 'msg', name: 'You', habit: 'Built the login screen for the to-do app', time: '11:15 AM',
    reactions: { heart: { count: 1, active: false }, fire: { count: 2, active: false }, thumb: { count: 0, active: false } } },
  { kind: 'msg', name: 'Rahul', habit: 'Practiced React hooks for 30 min', time: '8:02 PM',
    reactions: { heart: { count: 0, active: false }, fire: { count: 2, active: false }, thumb: { count: 1, active: false } } },

  { kind: 'date', label: 'Mon, 20 Jul' },
  { kind: 'msg', name: 'Aditi', habit: 'Solved 2 DSA problems', time: '9:40 AM',
    reactions: { heart: { count: 0, active: false }, fire: { count: 4, active: false }, thumb: { count: 0, active: false } } },
  { kind: 'msg', name: 'Meera', habit: 'Read Python docs for 20 minutes', time: '7:18 PM',
    reactions: { heart: { count: 2, active: false }, fire: { count: 0, active: false }, thumb: { count: 0, active: false } } },

  { kind: 'date', label: 'Tue, 21 Jul' },
  { kind: 'msg', name: 'You', habit: 'Refactored the API calls', time: '10:30 AM',
    reactions: { heart: { count: 1, active: false }, fire: { count: 0, active: false }, thumb: { count: 1, active: false } } },
  { kind: 'join', name: 'Kabir', time: '5:05 PM' },
  { kind: 'msg', name: 'Kabir', habit: 'Finished freeCodeCamp module 3', time: '9:05 PM',
    reactions: { heart: { count: 2, active: false }, fire: { count: 1, active: false }, thumb: { count: 0, active: false } } },

  { kind: 'date', label: 'Wed, 22 Jul' },
  { kind: 'msg', name: 'Rahul', habit: 'Watched a 30 min coding tutorial', time: '8:14 AM',
    reactions: { heart: { count: 0, active: false }, fire: { count: 3, active: false }, thumb: { count: 2, active: true } } },
  { kind: 'msg', name: 'Aditi', habit: 'Solved 2 DSA problems', time: '11:02 AM',
    reactions: { heart: { count: 0, active: false }, fire: { count: 1, active: false }, thumb: { count: 0, active: false } } },
  { kind: 'msg', name: 'You', habit: "Committed the day's progress", time: '1:47 PM',
    reactions: { heart: { count: 2, active: false }, fire: { count: 1, active: false }, thumb: { count: 0, active: false } } },
];

function withIdsAndRuns(items) {
  return items.map((item, i) => {
    if (item.kind !== 'msg') return { ...item, id: `e${i}` };
    const prev = items[i - 1];
    const next = items[i + 1];
    const isFirstInRun = !(prev && prev.kind === 'msg' && prev.name === item.name);
    const isLastInRun = !(next && next.kind === 'msg' && next.name === item.name);
    return { ...item, id: `e${i}`, isFirstInRun, isLastInRun, isOwn: item.name === 'You' };
  });
}

const initialTimeline = withIdsAndRuns(raw);

/* ---------- Small building blocks ---------- */

function ReactionPill({ kind, data, onToggle, compact }) {
  const meta = {
    heart: { Icon: Heart, tint: C.heart },
    fire: { Icon: Flame, tint: C.fire },
    thumb: { Icon: ThumbsUp, tint: C.thumb },
  }[kind];
  const { Icon, tint } = meta;
  const { count, active } = data;

  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1 rounded-full transition-transform duration-150 active:scale-90"
      style={{
        padding: compact ? '4px 8px' : '6px 12px',
        background: active ? `${tint}26` : '#201B18',
        border: `1px solid ${active ? tint : C.cardBorder}`,
        boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
      }}
    >
      <Icon size={12} strokeWidth={2.4} style={{ color: active ? tint : C.sub }} fill={active ? tint : 'none'} />
      {count > 0 && (
        <span style={{ fontFamily: BODY, fontSize: 11, fontWeight: 700, color: active ? C.ink : C.sub }}>
          {count}
        </span>
      )}
    </button>
  );
}

function Avatar({ name, size = 28 }) {
  const a = AVATARS[name] || { mark: name[0], color: C.gold };
  return (
    <div
      className="flex items-center justify-center rounded-full shrink-0"
      style={{ width: size, height: size, background: `${a.color}2A`, border: `1px solid ${a.color}66` }}
    >
      <span style={{ fontFamily: DISPLAY, fontSize: size * 0.42, fontWeight: 700, color: a.color }}>{a.mark}</span>
    </div>
  );
}

function OriginMarker({ label }) {
  return (
    <div className="flex items-center gap-3 my-3 px-1">
      <div className="flex-1 h-px" style={{ background: C.cardBorder }} />
      <span style={{ fontFamily: BODY, fontSize: 10.5, color: C.faint, whiteSpace: 'nowrap', letterSpacing: 0.2 }}>
        🌱 {label}
      </span>
      <div className="flex-1 h-px" style={{ background: C.cardBorder }} />
    </div>
  );
}

function DateDivider({ label }) {
  return (
    <div className="sticky top-0 z-10 flex justify-center py-2" style={{ background: 'linear-gradient(#0B0B0C 60%, transparent)' }}>
      <span
        style={{
          fontFamily: BODY, fontSize: 11, fontWeight: 700, color: C.sub,
          background: '#1B1512', border: `1px solid ${C.cardBorder}`,
          borderRadius: 999, padding: '5px 14px', letterSpacing: 0.3,
        }}
      >
        {label}
      </span>
    </div>
  );
}

function JoinNotice({ name, time }) {
  return (
    <div className="flex justify-center my-2">
      <span
        style={{
          fontFamily: BODY, fontSize: 11.5, color: C.sub,
          background: C.card, border: `1px dashed ${C.dashed}`,
          borderRadius: 999, padding: '5px 13px',
        }}
      >
        👋 <span style={{ color: C.ink, fontWeight: 600 }}>{name}</span> joined the room · {time}
      </span>
    </div>
  );
}

function MessageRow({ item, onReact }) {
  const { name, habit, time, reactions, isOwn, isFirstInRun, isLastInRun } = item;
  const a = AVATARS[name] || { mark: name[0], color: C.gold };

  const radius = {
    borderTopLeftRadius: 17,
    borderTopRightRadius: 17,
    borderBottomLeftRadius: !isOwn && isLastInRun ? 4 : 17,
    borderBottomRightRadius: isOwn && isLastInRun ? 4 : 17,
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`} style={{ marginTop: isFirstInRun ? 14 : 4 }}>
      {!isOwn && (
        <div className="shrink-0 mr-2 flex items-end" style={{ width: 28 }}>
          {isFirstInRun && <Avatar name={name} size={28} />}
        </div>
      )}

      <div className="flex flex-col" style={{ maxWidth: '76%', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
        {isFirstInRun && !isOwn && (
          <span style={{ fontFamily: BODY, fontSize: 11.5, fontWeight: 700, color: a.color, marginLeft: 4, marginBottom: 3 }}>
            {name}
          </span>
        )}

        <div
          style={{
            background: isOwn ? C.bubbleOwn : C.bubbleOther,
            border: `1px solid ${isOwn ? C.gold + '3A' : C.cardBorder}`,
            padding: '9px 12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            ...radius,
          }}
        >
          <p style={{ fontFamily: BODY, fontSize: 13.5, color: C.ink, lineHeight: 1.4 }}>
            {!isOwn && <span style={{ color: C.sub }}>completed </span>}
            <span style={{ fontWeight: 600 }}>{habit}</span>
          </p>
          <div className="flex items-center justify-end gap-1 mt-1">
            <span style={{ fontFamily: BODY, fontSize: 10, color: isOwn ? C.goldDeep : C.faint }}>{time}</span>
            {isOwn && <CheckCheck size={12} color={C.goldDeep} />}
          </div>
        </div>

        <div
          className="flex items-center gap-1.5 z-10"
          style={{ marginTop: -10, paddingLeft: isOwn ? 0 : 6, paddingRight: isOwn ? 6 : 0 }}
        >
          <ReactionPill compact kind="heart" data={reactions.heart} onToggle={() => onReact(item.id, 'heart')} />
          <ReactionPill compact kind="fire" data={reactions.fire} onToggle={() => onReact(item.id, 'fire')} />
          <ReactionPill compact kind="thumb" data={reactions.thumb} onToggle={() => onReact(item.id, 'thumb')} />
        </div>
      </div>
    </div>
  );
}

/* ---------- Room Info sheet ---------- */

function RoomInfoSheet({ open, onClose }) {
  const [copied, setCopied] = useState(false);
  const [username, setUsername] = useState('');
  const [sentTo, setSentTo] = useState('');
  const timeoutRef = useRef(null);
  const code = 'CODE-7F3K9';

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(code); } catch (e) {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const handleInvite = () => {
    const trimmed = username.trim().replace(/^@/, '');
    if (!trimmed) return;
    setSentTo(trimmed);
    setUsername('');
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setSentTo(''), 2200);
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end" style={{ pointerEvents: open ? 'auto' : 'none' }}>
      <div
        onClick={onClose}
        className="absolute inset-0 transition-opacity duration-300"
        style={{ background: 'rgba(0,0,0,0.6)', opacity: open ? 1 : 0 }}
      />
      <div
        className="relative transition-transform duration-300 ease-out"
        style={{
          background: '#141110',
          borderTop: `1px solid ${C.cardBorder}`,
          borderLeft: `1px solid ${C.cardBorder}`,
          borderRight: `1px solid ${C.cardBorder}`,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          transform: open ? 'translateY(0%)' : 'translateY(100%)',
          maxHeight: '86%',
          overflowY: 'auto',
        }}
      >
        <div className="flex justify-center pt-3">
          <div style={{ width: 36, height: 4, borderRadius: 999, background: C.cardBorder }} />
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex items-center justify-center rounded-full"
          style={{ width: 30, height: 30, background: '#221D1A', border: `1px solid ${C.cardBorder}` }}
        >
          <X size={15} color={C.sub} />
        </button>

        <div className="px-6 pt-5 pb-9">
          <div className="flex flex-col items-center text-center">
            <div
              className="flex items-center justify-center rounded-3xl"
              style={{ width: 72, height: 72, background: C.goldSoft, border: `1px solid ${C.gold}55` }}
            >
              <span style={{ fontSize: 30 }}>💻</span>
            </div>
            <h2 style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 700, color: C.ink, marginTop: 14 }}>
              Coding beginner
            </h2>
            <p style={{ fontFamily: BODY, fontSize: 13.5, color: C.sub, marginTop: 6, lineHeight: 1.5, maxWidth: 260 }}>
              Daily coding, everyone accountable together. Show up, log your rep, keep the streak alive.
            </p>
            <div className="flex items-center gap-1.5 mt-3">
              <span style={{ width: 6, height: 6, borderRadius: 999, background: C.gold }} />
              <span style={{ fontFamily: BODY, fontSize: 12, color: C.faint }}>5 members · 1 active today</span>
            </div>
          </div>

          <div className="mt-7">
            <span style={{ fontFamily: BODY, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: C.faint, textTransform: 'uppercase' }}>
              Members
            </span>
            <div className="mt-2.5 rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.cardBorder}`, background: '#17130F' }}>
              {MEMBERS.map((m, i) => (
                <div
                  key={m.name}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderTop: i === 0 ? 'none' : `1px solid ${C.cardBorder}` }}
                >
                  <Avatar name={m.name} size={32} />
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span style={{ fontFamily: BODY, fontSize: 13.5, fontWeight: 700, color: C.ink }}>
                        {m.name}
                      </span>
                      {m.you && (
                        <span
                          style={{
                            fontFamily: BODY, fontSize: 9.5, fontWeight: 700, color: C.goldDeep,
                            background: C.goldSoft, padding: '2px 6px', borderRadius: 999, letterSpacing: 0.3,
                          }}
                        >
                          YOU
                        </span>
                      )}
                    </div>
                    <span style={{ fontFamily: BODY, fontSize: 11.5, color: C.faint }}>{m.subtitle}</span>
                  </div>
                  {m.active && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: C.gold }} />
                      <span style={{ fontFamily: BODY, fontSize: 10.5, color: C.gold, fontWeight: 600 }}>Active</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-7">
            <span style={{ fontFamily: BODY, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: C.faint, textTransform: 'uppercase' }}>
              Invite code
            </span>
            <div
              className="flex items-center justify-between mt-2.5 rounded-2xl"
              style={{ border: `1.5px dashed ${C.dashed}`, padding: '14px 16px', background: '#17130F' }}
            >
              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 16, letterSpacing: 3, color: C.gold, fontWeight: 600 }}>
                {code}
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-full transition-transform active:scale-90"
                style={{ padding: '7px 12px', background: copied ? `${C.thumb}22` : C.goldSoft, border: `1px solid ${copied ? C.thumb : C.gold + '55'}` }}
              >
                {copied ? <Check size={13} color={C.thumb} /> : <Copy size={13} color={C.gold} />}
                <span style={{ fontFamily: BODY, fontSize: 11.5, fontWeight: 700, color: copied ? C.thumb : C.gold }}>
                  {copied ? 'Copied' : 'Copy'}
                </span>
              </button>
            </div>
            <p style={{ fontFamily: BODY, fontSize: 11.5, color: C.faint, marginTop: 8 }}>
              Anyone with this code can join the room.
            </p>
          </div>

          <div className="mt-7">
            <span style={{ fontFamily: BODY, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: C.faint, textTransform: 'uppercase' }}>
              Invite by username
            </span>
            <div className="flex items-center gap-2 mt-2.5">
              <div className="flex items-center gap-2 flex-1 rounded-2xl" style={{ background: '#1D1815', border: `1px solid ${C.cardBorder}`, padding: '11px 14px' }}>
                <AtSign size={15} color={C.faint} />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                  placeholder="username"
                  style={{ background: 'transparent', outline: 'none', border: 'none', color: C.ink, fontFamily: BODY, fontSize: 13.5, width: '100%' }}
                />
              </div>
              <button
                onClick={handleInvite}
                className="flex items-center gap-1.5 rounded-2xl shrink-0 transition-transform active:scale-95"
                style={{ background: C.gold, padding: '12px 16px' }}
              >
                <Send size={14} color="#2A2117" />
                <span style={{ fontFamily: BODY, fontSize: 13, fontWeight: 700, color: '#2A2117' }}>Send</span>
              </button>
            </div>
            <div style={{ minHeight: 20, marginTop: 8 }}>
              {sentTo && (
                <p style={{ fontFamily: BODY, fontSize: 12, color: C.thumb }}>Invite sent to @{sentTo}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Main screen ---------- */

export default function RoomDetail() {
  const [timeline, setTimeline] = useState(initialTimeline);
  const [infoOpen, setInfoOpen] = useState(false);
  const feedRef = useRef(null);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, []);

  const toggleReaction = (id, kind) => {
    setTimeline((prev) =>
      prev.map((item) => {
        if (item.id !== id || item.kind !== 'msg') return item;
        const cur = item.reactions[kind];
        const nextActive = !cur.active;
        return { ...item, reactions: { ...item.reactions, [kind]: { active: nextActive, count: cur.count + (nextActive ? 1 : -1) } } };
      })
    );
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center py-8" style={{ background: '#000' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');`}</style>

      <div
        className="relative w-full overflow-hidden"
        style={{ maxWidth: 380, height: 780, background: C.bg, borderRadius: 36, border: '1px solid #232019', boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}
      >
        {/* ---- top bar ---- */}
        <div className="px-5 pt-6 pb-4" style={{ borderBottom: '1px solid #1C1815' }}>
          <div className="flex items-center gap-3">
            <button
              className="flex items-center justify-center rounded-full shrink-0"
              style={{ width: 34, height: 34, background: '#18140F', border: `1px solid ${C.cardBorder}` }}
            >
              <ArrowLeft size={16} color={C.ink} />
            </button>

            <button onClick={() => setInfoOpen(true)} className="flex items-center gap-2 flex-1 min-w-0 transition-opacity active:opacity-70">
              <div className="flex items-center justify-center rounded-xl shrink-0" style={{ width: 34, height: 34, background: C.goldSoft, border: `1px solid ${C.gold}44` }}>
                <span style={{ fontSize: 16 }}>💻</span>
              </div>
              <div className="flex flex-col items-start min-w-0">
                <span style={{ fontFamily: DISPLAY, fontSize: 16.5, fontWeight: 700, color: C.ink, lineHeight: 1.15 }} className="truncate">
                  Coding beginner
                </span>
                <span style={{ fontFamily: BODY, fontSize: 11, color: C.faint }}>Tap for room info</span>
              </div>
              <ChevronRight size={16} color={C.faint} className="shrink-0 ml-auto" />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <div className="flex items-center gap-1.5 rounded-full" style={{ padding: '5px 10px', background: '#1B1512', border: `1px solid ${C.cardBorder}` }}>
              <Flame size={12} color={C.fire} />
              <span style={{ fontFamily: BODY, fontSize: 11.5, fontWeight: 600, color: C.ink }}>4 day streak</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full" style={{ padding: '5px 10px', background: '#1B1512', border: `1px solid ${C.cardBorder}` }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: C.gold }} />
              <span style={{ fontFamily: BODY, fontSize: 11.5, fontWeight: 600, color: C.ink }}>1 active now</span>
            </div>
          </div>
        </div>

        {/* ---- chat-style feed, oldest at top, newest at bottom ---- */}
        <div ref={feedRef} className="px-4 pb-5 overflow-y-auto" style={{ height: 'calc(100% - 128px)' }}>
          {timeline.map((item) => {
            if (item.kind === 'origin') return <OriginMarker key={item.id} label={item.label} />;
            if (item.kind === 'date') return <DateDivider key={item.id} label={item.label} />;
            if (item.kind === 'join') return <JoinNotice key={item.id} name={item.name} time={item.time} />;
            return <MessageRow key={item.id} item={item} onReact={toggleReaction} />;
          })}
        </div>

        <RoomInfoSheet open={infoOpen} onClose={() => setInfoOpen(false)} />
      </div>
    </div>
  );
}