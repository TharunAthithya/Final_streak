import React, { useState, useEffect } from 'react';
import { Colors } from '@streak/design-tokens';
import { StreakApiClient } from '@streak/api-client';

const API_URL = 'http://localhost:4000';
const client = new StreakApiClient(API_URL);

export function App() {
  // Auth state
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [screen, setScreen] = useState<'WELCOME' | 'SIGNIN' | 'SIGNUP' | 'DASHBOARD' | 'ROOM_DETAIL' | 'SETTINGS'>('WELCOME');
  const [tab, setTab] = useState<'TODAY' | 'ROOMS' | 'YOU'>('TODAY');

  // Input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [habitName, setHabitName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomDesc, setRoomDesc] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [targetName, setTargetName] = useState('');

  // Data states
  const [habits, setHabits] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [roomDetails, setRoomDetails] = useState<any | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize session on mount
  useEffect(() => {
    const cachedToken = localStorage.getItem('token');
    if (cachedToken) {
      client.setToken(cachedToken);
      setToken(cachedToken);
      client.getMe().then(setUser).catch(() => handleLogout());
    }
  }, []);

  // Fetch tab details when user token is set
  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, screen, tab, selectedRoomId]);

  const fetchData = async () => {
    try {
      if (screen === 'DASHBOARD' && tab === 'TODAY') {
        const data = await client.getHabits();
        setHabits(data);
      } else if (screen === 'DASHBOARD' && tab === 'ROOMS') {
        const data = await client.getRooms();
        setRooms(data);
      } else if (screen === 'ROOM_DETAIL' && selectedRoomId) {
        const details = await client.getRoomDetails(selectedRoomId);
        setRoomDetails(details);
        const acts = await client.getRoomActivity(selectedRoomId);
        setActivities(acts);
        const board = await client.getRoomLeaderboard(selectedRoomId);
        setLeaderboard(board);
      }
    } catch (e: any) {
      console.warn('Web fetch error:', e.message);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const mockToken = `web-dev-token-${email}-${Date.now()}`;
      localStorage.setItem('token', mockToken);
      client.setToken(mockToken);
      setToken(mockToken);

      const profile = await client.getMe();
      setUser(profile);
      setScreen('DASHBOARD');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const mockToken = `web-dev-token-${email}-${Date.now()}`;
      localStorage.setItem('token', mockToken);
      client.setToken(mockToken);
      setToken(mockToken);

      const profile = await client.updateProfile({
        displayName,
        username,
        timezone: 'UTC',
      });
      setUser(profile);
      setScreen('DASHBOARD');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    client.setToken(null);
    setToken(null);
    setUser(null);
    setScreen('WELCOME');
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you absolutely sure you want to delete your account? This is irreversible.')) {
      try {
        await client.deleteAccount();
        handleLogout();
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  const handleCheckIn = async (habitId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const key = `web-idemp-${habitId}-${today}-${Date.now()}`;
    try {
      await client.checkInHabit(habitId, {
        localDate: today,
        timezoneAtCompletion: 'UTC',
        idempotencyKey: key,
      });
      fetchData();
      // Re-fetch profile to update level/XP
      const profile = await client.getMe();
      setUser(profile);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitName.trim()) return;
    try {
      await client.createHabit({
        name: habitName,
        scheduleType: 'DAILY',
        timezone: 'UTC',
        startDate: new Date().toISOString().split('T')[0],
      });
      setHabitName('');
      fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return;
    try {
      await client.createRoom({
        name: roomName,
        description: roomDesc,
        visibility: 'PUBLIC',
      });
      setRoomName('');
      setRoomDesc('');
      fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    try {
      await client.joinRoom({ inviteCode: inviteCode.toUpperCase() });
      setInviteCode('');
      fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleCreateTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetName.trim() || !selectedRoomId) return;
    try {
      await client.createRoomHabit(selectedRoomId, targetName);
      setTargetName('');
      fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleLinkHabit = async (roomHabitId: string, personalHabitId: string) => {
    if (!selectedRoomId) return;
    try {
      await client.linkPersonalHabit(selectedRoomId, roomHabitId, personalHabitId);
      fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleUnlinkHabit = async (roomHabitId: string) => {
    if (!selectedRoomId) return;
    try {
      await client.unlinkPersonalHabit(selectedRoomId, roomHabitId);
      fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleReact = async (actId: string, emoji: string) => {
    try {
      await client.reactToActivity(actId, emoji);
      fetchData();
    } catch (e: any) {
      console.warn('Web react error:', e.message);
    }
  };

  // --- RENDERING VIEWS ---

  if (screen === 'WELCOME') {
    return (
      <div style={styles.fullscreen}>
        <div style={styles.authCard}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔥</div>
          <h1 style={styles.heroTitle}>Streak</h1>
          <p style={styles.tagline}>Quiet accountability for builders.</p>
          <p style={styles.bodyText}>Instantly track consistency, share progress in rooms, and level up with zero social noise.</p>
          <button style={styles.primaryButton} onClick={() => setScreen('SIGNUP')}>Get Started</button>
          <button style={styles.secondaryButton} onClick={() => setScreen('SIGNIN')}>Log In</button>
        </div>
      </div>
    );
  }

  if (screen === 'SIGNIN' || screen === 'SIGNUP') {
    return (
      <div style={styles.fullscreen}>
        <div style={styles.authCard}>
          <h2 style={styles.sectionTitle}>{screen === 'SIGNIN' ? 'Sign In' : 'Sign Up'}</h2>
          {error && <p style={styles.errorText}>{error}</p>}
          <form onSubmit={screen === 'SIGNIN' ? handleLogin : handleSignup} style={styles.form}>
            {screen === 'SIGNUP' && (
              <>
                <input
                  style={styles.inputField}
                  placeholder="Full Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
                <input
                  style={styles.inputField}
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </>
            )}
            <input
              style={styles.inputField}
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              style={styles.inputField}
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" style={styles.primaryButton}>
              {screen === 'SIGNIN' ? 'Access Account' : 'Register Profile'}
            </button>
          </form>
          <button style={styles.linkButton} onClick={() => setScreen('WELCOME')}>Cancel</button>
        </div>
      </div>
    );
  }

  if (screen === 'DASHBOARD') {
    return (
      <div style={styles.dashboardLayout}>
        {/* Sidebar Nav */}
        <aside style={styles.sidebar}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 24px 0', color: Colors.primary }}>🔥 Streak</h2>
          <nav style={styles.navStack}>
            <button style={{ ...styles.navItem, ...(tab === 'TODAY' && styles.navItemActive) }} onClick={() => setTab('TODAY')}>Today</button>
            <button style={{ ...styles.navItem, ...(tab === 'ROOMS' && styles.navItemActive) }} onClick={() => setTab('ROOMS')}>Rooms</button>
            <button style={{ ...styles.navItem, ...(tab === 'YOU' && styles.navItemActive) }} onClick={() => setTab('YOU')}>You</button>
          </nav>
          <button style={styles.logoutButton} onClick={handleLogout}>Log Out</button>
        </aside>

        {/* Content Panel */}
        <main style={styles.contentPanel}>
          {tab === 'TODAY' && (
            <div>
              <h1 style={styles.pageTitle}>Today</h1>
              <p style={styles.subtitle}>Complete your routine checklist for {new Date().toLocaleDateString()}</p>

              {/* Create Habit Form */}
              <form onSubmit={handleCreateHabit} style={styles.createHabitForm}>
                <input
                  style={styles.inputFieldCompact}
                  placeholder="New habit name..."
                  value={habitName}
                  onChange={(e) => setHabitName(e.target.value)}
                />
                <button type="submit" style={styles.actionButton}>Add Habit</button>
              </form>

              {/* Habit List */}
              <div style={styles.listStack}>
                {habits.length === 0 ? (
                  <p style={styles.emptyText}>No habits defined yet.</p>
                ) : (
                  habits.map((h) => (
                    <div key={h.id} style={styles.habitItem}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{h.name}</h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: Colors.textSecondary }}>🔥 {h.stats?.currentStreak || 0} day streak</p>
                      </div>
                      <button style={styles.checkIcon} onClick={() => handleCheckIn(h.id)}>✓</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === 'ROOMS' && (
            <div>
              <h1 style={styles.pageTitle}>Accountability Rooms</h1>

              {/* Actions Box */}
              <div style={styles.roomsActionsGrid}>
                <form onSubmit={handleCreateRoom} style={styles.roomSubForm}>
                  <h3 style={{ margin: '0 0 12px 0' }}>Create Room</h3>
                  <input style={styles.inputField} placeholder="Room Name" value={roomName} onChange={(e) => setRoomName(e.target.value)} />
                  <input style={styles.inputField} placeholder="Description" value={roomDesc} onChange={(e) => setRoomDesc(e.target.value)} />
                  <button type="submit" style={styles.primaryButton}>Create</button>
                </form>

                <form onSubmit={handleJoinRoom} style={styles.roomSubForm}>
                  <h3 style={{ margin: '0 0 12px 0' }}>Join Room</h3>
                  <input style={styles.inputField} placeholder="Invite Code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
                  <button type="submit" style={styles.primaryButton}>Join</button>
                </form>
              </div>

              {/* Room Cards List */}
              <div style={styles.roomsGrid}>
                {rooms.map((r) => (
                  <div key={r.id} style={styles.roomCard} onClick={() => { setSelectedRoomId(r.id); setScreen('ROOM_DETAIL'); }}>
                    <h3 style={{ margin: '0 0 8px 0' }}>{r.name}</h3>
                    <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: Colors.textSecondary }}>{r.description}</p>
                    <span style={{ fontSize: '12px', color: Colors.textMuted }}>Code: {r.inviteCode}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'YOU' && (
            <div style={styles.profileBox}>
              <h1 style={styles.pageTitle}>Your Profile</h1>
              <div style={styles.avatarLarge}>👤</div>
              <h2>{user?.displayName}</h2>
              <p style={{ color: Colors.textSecondary }}>@{user?.username}</p>

              <div style={styles.xpTracker}>
                <span style={{ fontWeight: 600 }}>Level {user?.level || 1} — {user?.xp || 0} XP</span>
                <div style={styles.barOuter}>
                  <div style={{ ...styles.barInner, width: `${(user?.xp || 0) % 100}%` }} />
                </div>
              </div>

              <button style={styles.deleteAccountButton} onClick={handleDeleteAccount}>Delete Account</button>
            </div>
          )}
        </main>
      </div>
    );
  }

  if (screen === 'ROOM_DETAIL' && roomDetails) {
    return (
      <div style={styles.dashboardLayout}>
        <aside style={styles.sidebar}>
          <button style={styles.logoutButton} onClick={() => setScreen('DASHBOARD')}>← Back</button>
        </aside>

        <main style={styles.contentPanel}>
          <h1 style={styles.pageTitle}>{roomDetails.name}</h1>
          <p style={styles.subtitle}>{roomDetails.description}</p>
          <p style={{ fontSize: '14px', color: Colors.textMuted }}>Invite Code: {roomDetails.inviteCode}</p>

          <div style={styles.roomGridSplit}>
            <div>
              <h3 style={styles.sectionTitle}>Targets</h3>
              {roomDetails.roomHabits?.map((rh: any) => (
                <div key={rh.id} style={styles.targetItemRow}>
                  <span>{rh.name}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={styles.linkButtonTiny} onClick={() => handleLinkHabit(rh.id, habits[0]?.id)}>Link Habit</button>
                    <button style={styles.linkButtonTiny} onClick={() => handleUnlinkHabit(rh.id)}>Unlink</button>
                  </div>
                </div>
              ))}

              <form onSubmit={handleCreateTarget} style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                <input style={styles.inputFieldCompact} placeholder="Target Name" value={targetName} onChange={(e) => setTargetName(e.target.value)} />
                <button type="submit" style={styles.actionButton}>Add</button>
              </form>
            </div>

            <div>
              <h3 style={styles.sectionTitle}>Rankings</h3>
              {leaderboard.map((item) => (
                <div key={item.userId} style={styles.rankItemRow}>
                  <span>#{item.rank} {item.displayName}</span>
                  <strong>{item.score} completions</strong>
                </div>
              ))}

              <h3 style={styles.sectionTitle}>Feed</h3>
              {activities.map((act) => (
                <div key={act.id} style={styles.feedCard}>
                  <p style={{ margin: '0 0 8px 0' }}>{act.message}</p>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button style={styles.reactBtn} onClick={() => handleReact(act.id, 'fire')}>
                      🔥 {act.reactions?.find((r: any) => r.type === 'fire')?.count || 0}
                    </button>
                    <button style={styles.reactBtn} onClick={() => handleReact(act.id, 'clap')}>
                      👏 {act.reactions?.find((r: any) => r.type === 'clap')?.count || 0}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return null;
}

const styles = {
  fullscreen: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: Colors.background,
    padding: '24px',
  },
  authCard: {
    backgroundColor: Colors.surface,
    borderRadius: '12px',
    padding: '40px',
    border: `1px solid ${Colors.border}`,
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center' as const,
    boxShadow: '0 4px 16px rgba(0,0,0,0.01)',
  },
  heroTitle: {
    fontSize: '28px',
    fontWeight: 700,
    margin: '0 0 8px 0',
  },
  tagline: {
    fontSize: '15px',
    color: Colors.primary,
    fontWeight: 600,
    margin: '0 0 12px 0',
  },
  bodyText: {
    fontSize: '14px',
    color: Colors.textSecondary,
    margin: '0 0 24px 0',
    lineHeight: '1.6',
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    color: Colors.surface,
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
    marginBottom: '12px',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    color: Colors.textPrimary,
    border: `1px solid ${Colors.border}`,
    borderRadius: '8px',
    padding: '12px 24px',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: Colors.textSecondary,
    cursor: 'pointer',
    marginTop: '16px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    marginTop: '24px',
  },
  inputField: {
    padding: '12px',
    borderRadius: '8px',
    border: `1px solid ${Colors.border}`,
    fontSize: '14px',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  errorText: {
    color: Colors.error,
    fontSize: '14px',
  },
  dashboardLayout: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: Colors.background,
  },
  sidebar: {
    width: '240px',
    backgroundColor: Colors.surface,
    borderRight: `1px solid ${Colors.border}`,
    padding: '32px 24px',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  navStack: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    flex: 1,
  },
  navItem: {
    background: 'none',
    border: 'none',
    textAlign: 'left' as const,
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 500,
    cursor: 'pointer',
    color: Colors.textSecondary,
  },
  navItemActive: {
    backgroundColor: Colors.primarySoft,
    color: Colors.primary,
    fontWeight: 600,
  },
  logoutButton: {
    background: 'none',
    border: `1px solid ${Colors.border}`,
    borderRadius: '8px',
    padding: '10px',
    cursor: 'pointer',
    color: Colors.textSecondary,
  },
  contentPanel: {
    flex: 1,
    padding: '40px 48px',
    maxWidth: '1000px',
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: 700,
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '15px',
    color: Colors.textSecondary,
    margin: '0 0 32px 0',
  },
  createHabitForm: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  },
  inputFieldCompact: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: `1px solid ${Colors.border}`,
    fontSize: '14px',
    flex: 1,
  },
  actionButton: {
    backgroundColor: Colors.primary,
    color: Colors.surface,
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  listStack: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  habitItem: {
    backgroundColor: Colors.surface,
    border: `1px solid ${Colors.border}`,
    borderRadius: '8px',
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '18px',
    border: 'none',
    backgroundColor: Colors.primarySoft,
    color: Colors.primary,
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: '14px',
  },
  roomsActionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginBottom: '40px',
  },
  roomSubForm: {
    backgroundColor: Colors.surface,
    padding: '24px',
    borderRadius: '12px',
    border: `1px solid ${Colors.border}`,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  roomsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  roomCard: {
    backgroundColor: Colors.surface,
    padding: '20px',
    borderRadius: '8px',
    border: `1px solid ${Colors.border}`,
    cursor: 'pointer',
  },
  profileBox: {
    backgroundColor: Colors.surface,
    padding: '40px',
    borderRadius: '12px',
    border: `1px solid ${Colors.border}`,
    textAlign: 'center' as const,
    maxWidth: '480px',
  },
  avatarLarge: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  xpTracker: {
    margin: '24px 0',
  },
  barOuter: {
    height: '10px',
    backgroundColor: Colors.background,
    borderRadius: '5px',
    overflow: 'hidden',
    marginTop: '8px',
  },
  barInner: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  deleteAccountButton: {
    backgroundColor: Colors.error,
    color: Colors.surface,
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: Colors.textSecondary,
    margin: '24px 0 12px 0',
    textTransform: 'uppercase' as const,
  },
  targetItemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: Colors.surface,
    border: `1px solid ${Colors.border}`,
    borderRadius: '8px',
    marginBottom: '8px',
  },
  linkButtonTiny: {
    background: 'none',
    border: `1px solid ${Colors.border}`,
    borderRadius: '4px',
    fontSize: '12px',
    padding: '4px 8px',
    cursor: 'pointer',
  },
  rankItemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: `1px solid ${Colors.border}`,
  },
  feedCard: {
    backgroundColor: Colors.surface,
    padding: '16px',
    borderRadius: '8px',
    border: `1px solid ${Colors.border}`,
    marginTop: '8px',
  },
  reactBtn: {
    background: 'none',
    border: `1px solid ${Colors.border}`,
    padding: '4px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  roomGridSplit: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.2fr',
    gap: '32px',
    marginTop: '24px',
  },
};

export default App;
