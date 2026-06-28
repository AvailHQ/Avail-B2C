import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Zap,
  Users,
  CheckCircle2,
  Copy,
  Check,
  Share2,
  ArrowRight,
  Mail,
  User,
  RefreshCw,
  AlertTriangle,
  Calendar,
  Activity,
  Shield,
  ChevronRight,
  GitBranch,
} from 'lucide-react';
import './App.css';

interface UserInfo {
  _id: string;
  name: string;
  email: string;
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  queuePosition: number;
}

const GITHUB_CLIENT_ID = 'Ov23liccG0IvKASKtqNn';
const WAITLIST_STORAGE_KEY = 'avail_waitlist_users';

const loadWaitlist = (): UserInfo[] => {
  try {
    const saved = window.localStorage.getItem(WAITLIST_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveWaitlist = (users: UserInfo[]) => {
  window.localStorage.setItem(WAITLIST_STORAGE_KEY, JSON.stringify(users));
};

const createReferralCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export default function App() {
  const [status, setStatus] = useState<'join' | 'success' | 'check'>('join');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [referredByCode, setReferredByCode] = useState('');
  const [checkEmail, setCheckEmail] = useState('');
  const [totalSignups, setTotalSignups] = useState(() => loadWaitlist().length);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinedUser, setJoinedUser] = useState<UserInfo | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) setReferredByCode(ref.toUpperCase());

    // Handle GitHub OAuth callback
    const code = params.get('code');
    if (code && !params.get('handled')) {
      handleGitHubCallback(code);
    }
  }, []);

  const fireConfetti = () => {
    confetti({ particleCount: 180, spread: 90, origin: { y: 0.55 }, colors: ['#6FBF9E', '#4FA3C7', '#ffffff', '#b7e3d4'] });
  };

  const handleGitHubOAuth = () => {
    const redirectUri = encodeURIComponent(window.location.origin);
    const scope = encodeURIComponent('user:email');
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scope}`;
  };

  const handleGitHubCallback = async (code: string) => {
    // In a real integration with Convex Auth, this would be handled automatically.
    // For now, show the form with a note that GitHub auth will be fully wired once Convex Auth is configured.
    console.log('GitHub code received:', code);
    // Clear the code from URL
    window.history.replaceState({}, document.title, '/');
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) { setError('Please fill in all fields.'); return; }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) { setError('Please enter a valid email address.'); return; }
    setLoading(true);
    setError(null);
    try {
      const users = loadWaitlist();
      const normalizedEmail = email.trim().toLowerCase();
      const existing = users.find(user => user.email === normalizedEmail);

      if (existing) {
        setJoinedUser(existing);
        setStatus('success');
        fireConfetti();
        return;
      }

      const referrer = referredByCode
        ? users.find(user => user.referralCode === referredByCode.trim().toUpperCase())
        : undefined;

      const updatedUsers = referrer
        ? users.map(user => user._id === referrer._id
          ? { ...user, referralCount: user.referralCount + 1, queuePosition: Math.max(1, user.queuePosition - 10) }
          : user)
        : users;

      const user: UserInfo = {
        _id: crypto.randomUUID(),
        name: name.trim(),
        email: normalizedEmail,
        referralCode: createReferralCode(),
        referredBy: referrer?.referralCode,
        referralCount: 0,
        queuePosition: updatedUsers.length + 1,
      };

      const nextUsers = [...updatedUsers, user];
      saveWaitlist(nextUsers);
      setTotalSignups(nextUsers.length);
      setJoinedUser(user);
      setStatus('success');
      fireConfetti();
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkEmail.trim()) { setError('Please enter your email.'); return; }
    setLoading(true);
    setError(null);
    const normalizedEmail = checkEmail.trim().toLowerCase();
    const user = loadWaitlist().find(entry => entry.email === normalizedEmail);
    setLoading(false);
    if (user) {
      setJoinedUser(user);
      setStatus('success');
      fireConfetti();
    } else {
      setError("We couldn't find that email. Check the spelling or register below.");
    }
  };

  const handleCopy = () => {
    if (!joinedUser) return;
    navigator.clipboard.writeText(`${window.location.origin}?ref=${joinedUser.referralCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const referralLink = joinedUser ? `${window.location.origin}?ref=${joinedUser.referralCode}` : '';

  return (
    <div className="app-container">
      {/* Ambient background blobs */}
      <div className="bg-blob bg-blob-1" />
      <div className="bg-blob bg-blob-2" />
      <div className="bg-blob bg-blob-3" />

      <div className="content-layer">
        {/* ── Navbar ─────────────────────────────────── */}
        <nav className="navbar">
          <div className="logo">
            <div className="logo-mark">A</div>
            Avail
          </div>
          <div className="nav-actions">
            {status !== 'check' ? (
              <button
                className="nav-pill"
                onClick={() => { setStatus('check'); setError(null); setCheckEmail(''); }}
              >
                Check Status <ChevronRight size={14} />
              </button>
            ) : (
              <button
                className="nav-pill"
                onClick={() => { setStatus('join'); setError(null); }}
              >
                Register
              </button>
            )}
            <button className="nav-pill nav-pill-primary" onClick={handleGitHubOAuth}>
              <GitBranch size={14} /> Sign in with GitHub
            </button>
          </div>
        </nav>

        {/* ── Hero ───────────────────────────────────── */}
        <section className="hero-section">
          <div className="hero-badge fade-up">
            <div className="hero-badge-dot" />
            Exclusively for female athletes
          </div>

          <h1 className="hero-title fade-up fade-up-delay-1">
            Your Performance,<br />
            <span className="gradient-text">Finally Available</span>
          </h1>

          <p className="hero-sub fade-up fade-up-delay-2">
            Avail is built for the modern female athlete — unifying training schedules, team availability, recovery tracking and performance insights into a single, intelligent command centre.
          </p>

          {totalSignups > 0 ? (
            <div className="hero-live-count fade-up fade-up-delay-3">
              {totalSignups} athletes have already secured early access
            </div>
          ) : (
            <div className="hero-live-count fade-up fade-up-delay-3">
              Be among the first athletes to get access
            </div>
          )}

          <div className="stats-row fade-up fade-up-delay-3">
            <div className="stat-item">
              <span className="stat-value gradient-text">100%</span>
              <span className="stat-label">Built for women</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-value gradient-text">50ms</span>
              <span className="stat-label">Command response</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-value gradient-text">Q3 '26</span>
              <span className="stat-label">Early access launch</span>
            </div>
          </div>
        </section>

        {/* ── Waitlist Section (Two Column) ──────────── */}
        <section className="waitlist-section">
          {/* Left column: pitch */}
          <div className="waitlist-left fade-up">
            <span className="section-label">Early Access Waitlist</span>
            <h2 className="waitlist-heading">
              Perform at your peak, every single day.
            </h2>
            <p className="waitlist-description">
              Avail aggregates everything — training plans, match schedules, physiotherapy bookings, and team comms — giving you one frictionless space to manage your athletic life.
            </p>

            <ul className="perks-list">
              {[
                { icon: <Zap size={14} />, text: 'Priority access before public launch' },
                { icon: <Activity size={14} />, text: 'Free premium tier for first 500 members' },
                { icon: <Calendar size={14} />, text: 'Early influence on product features' },
                { icon: <Shield size={14} />, text: 'Founding athlete badge on your profile' },
                { icon: <Users size={14} />, text: 'Refer friends — jump 10 spots per referral' },
              ].map((perk, i) => (
                <li key={i} className="perk-item">
                  <span className="perk-icon">{perk.icon}</span>
                  {perk.text}
                </li>
              ))}
            </ul>
          </div>

          {/* Right column: form card */}
          <div className="glass-card fade-up fade-up-delay-1">

            {error && (
              <div className="alert-error">
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* ── STATE: JOIN ─────────────────────── */}
            {status === 'join' && (
              <>
                <h2 className="card-title">Claim your spot</h2>
                <p className="card-desc">Sign up to secure early access and your unique referral link.</p>

                {/* GitHub button */}
                <button id="github-signin-btn" className="github-btn" onClick={handleGitHubOAuth}>
                  <GitBranch size={18} />
                  Continue with GitHub
                </button>

                <div className="divider">
                  <div className="divider-line" />
                  <span className="divider-text">or with email</span>
                  <div className="divider-line" />
                </div>

                <form onSubmit={handleJoin} className="waitlist-form">
                  <div className="form-group">
                    <label className="form-label" htmlFor="join-name">Full Name</label>
                    <div className="input-wrapper">
                      <User size={16} className="input-icon" />
                      <input
                        id="join-name"
                        type="text"
                        placeholder="Sara Lindon"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="form-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="join-email">Email Address</label>
                    <div className="input-wrapper">
                      <Mail size={16} className="input-icon" />
                      <input
                        id="join-email"
                        type="email"
                        placeholder="sara@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="form-input"
                        required
                      />
                    </div>
                  </div>

                  {referredByCode && (
                    <div className="referral-tag">
                      <Users size={14} />
                      Referred by <strong>{referredByCode}</strong> — leapfrog boost active!
                    </div>
                  )}

                  <button id="join-submit-btn" type="submit" disabled={loading} className="btn-primary">
                    {loading
                      ? <><RefreshCw className="animate-spin" size={16} /> Securing Spot…</>
                      : <>Secure Early Access <ArrowRight size={16} /></>
                    }
                  </button>
                </form>

                <button className="btn-text" onClick={() => { setStatus('check'); setError(null); setCheckEmail(''); }}>
                  Already registered? Check your position
                </button>
              </>
            )}

            {/* ── STATE: CHECK ────────────────────── */}
            {status === 'check' && (
              <>
                <h2 className="card-title">Check your position</h2>
                <p className="card-desc">Enter your registration email to retrieve your queue rank and share link.</p>

                <form onSubmit={handleCheckStatus} className="waitlist-form">
                  <div className="form-group">
                    <label className="form-label" htmlFor="check-email">Email Address</label>
                    <div className="input-wrapper">
                      <Mail size={16} className="input-icon" />
                      <input
                        id="check-email"
                        type="email"
                        placeholder="sara@example.com"
                        value={checkEmail}
                        onChange={e => setCheckEmail(e.target.value)}
                        className="form-input"
                        required
                      />
                    </div>
                  </div>

                  <button id="check-submit-btn" type="submit" disabled={loading} className="btn-primary">
                    {loading
                      ? <><RefreshCw className="animate-spin" size={16} /> Searching…</>
                      : <>Find My Spot <ArrowRight size={16} /></>
                    }
                  </button>
                </form>

                <button className="btn-text" onClick={() => { setStatus('join'); setError(null); }}>
                  Back to registration
                </button>
              </>
            )}

            {/* ── STATE: SUCCESS ──────────────────── */}
            {status === 'success' && joinedUser && (
              <div className="success-wrapper">
                <div className="success-icon">
                  <CheckCircle2 size={40} />
                </div>

                <div>
                  <h2 className="card-title">You're in, {joinedUser.name.split(' ')[0]}! 🎉</h2>
                  <p className="card-desc" style={{ marginBottom: 0 }}>
                    You're on the Avail waitlist. Refer other female athletes to climb the queue faster.
                  </p>
                </div>

                <div className="rank-card">
                  <div className="rank-cell">
                    <span className="rank-num">#{joinedUser.queuePosition}</span>
                    <span className="rank-lbl">Queue Rank</span>
                  </div>
                  <div className="rank-cell">
                    <span className="rank-num">{joinedUser.referralCount}</span>
                    <span className="rank-lbl">Referrals</span>
                  </div>
                  <div className="rank-cell">
                    <span className="rank-num">+10</span>
                    <span className="rank-lbl">Per Referral</span>
                  </div>
                </div>

                <div style={{ width: '100%', textAlign: 'left' }}>
                  <p style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem', color: 'var(--color-text-primary)' }}>
                    Your Referral Link
                  </p>
                  <div className="referral-link-row">
                    <input className="referral-input" value={referralLink} readOnly title={referralLink} />
                    <button className="btn-secondary" onClick={handleCopy}>
                      {copied ? <Check size={15} /> : <Copy size={15} />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="share-grid">
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Just secured early access to @availapp — the platform built for female athletes 💪 Join me: ${referralLink}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="share-btn"
                  >
                    <Share2 size={14} /> Share on X
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="share-btn"
                  >
                    <Users size={14} /> LinkedIn
                  </a>
                </div>

                <button className="btn-text" onClick={() => { setStatus('join'); setName(''); setEmail(''); setJoinedUser(null); setError(null); }}>
                  Register another athlete
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ── Features Section ───────────────────────── */}
        <section className="features-section">
          <div className="section-header">
            <span className="section-label">What Avail Does</span>
            <h2 className="section-title">Your whole athletic life,<br /><span className="gradient-text">in one place</span></h2>
            <p className="section-sub">
              Designed from the ground up for female athletes who are serious about performance, recovery, and team coordination.
            </p>
          </div>

          <div className="features-grid">
            {[
              {
                icon: <Calendar size={22} />,
                name: 'Smart Schedule',
                desc: 'Unify training sessions, matches, physio appointments and rest days into a single adaptive calendar you can search in seconds.',
              },
              {
                icon: <Users size={22} />,
                name: 'Team Availability',
                desc: 'See who\'s available, injured, or travelling at a glance. Coordinate squad logistics without the endless group chat noise.',
              },
              {
                icon: <Activity size={22} />,
                name: 'Recovery Insights',
                desc: 'Track load, HRV, sleep quality and injury history. Avail learns your patterns and flags when you need more recovery time.',
              },
              {
                icon: <Zap size={22} />,
                name: 'Command Mode',
                desc: 'Press Cmd+K and ask anything — "Who\'s free Saturday?", "Show last week\'s sessions", "Book physio". Instant answers.',
              },
              {
                icon: <Shield size={22} />,
                name: 'Private by Design',
                desc: 'Your health and performance data belongs to you. Granular controls over what you share, with coaches and with your team.',
              },
              {
                icon: <Share2 size={22} />,
                name: 'Integrations',
                desc: 'Connects with Strava, Garmin, MyFitnessPal, Notion, Google Calendar and more — wherever your athletic life already lives.',
              },
            ].map((f, i) => (
              <div key={i} className="feature-card">
                <div className="feature-icon-box">{f.icon}</div>
                <h3 className="feature-name">{f.name}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Social Proof ───────────────────────────── */}
        <section className="social-section">
          <div className="social-inner">
            <span className="section-label">From the Community</span>
            <h2 className="section-title">Athletes who are waiting</h2>

            <div className="quotes-grid">
              {[
                {
                  text: 'I spend more time coordinating my calendar than I do training. Avail looks like the solution I\'ve been waiting for.',
                  name: 'Mia R.',
                  role: 'Semi-pro footballer · Manchester',
                  initial: 'M',
                },
                {
                  text: 'As a captain, managing team availability is a full-time job. I need something that actually understands athlete schedules.',
                  name: 'Priya S.',
                  role: 'University rugby captain · Leeds',
                  initial: 'P',
                },
                {
                  text: 'Every app I\'ve tried was built for men and adapted badly. The fact that Avail is built from scratch for us means everything.',
                  name: 'Zara T.',
                  role: 'Track & field athlete · London',
                  initial: 'Z',
                },
              ].map((q, i) => (
                <div key={i} className="quote-card">
                  <p className="quote-text">{q.text}</p>
                  <div className="quote-author">
                    <div className="quote-avatar">{q.initial}</div>
                    <div>
                      <div className="quote-name">{q.name}</div>
                      <div className="quote-role">{q.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Footer ─────────────────────────────────── */}
        <footer className="footer">
          <div>© 2026 Avail. Built for female athletes.</div>
          <div className="footer-links">
            <a href="#" className="footer-link">Privacy</a>
            <a href="#" className="footer-link">Terms</a>
            <a href="#" className="footer-link">Contact</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
