import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import confetti from 'canvas-confetti';
import {
  Activity,
  Calendar,
  Database,
  Share2,
  Shield,
  TrendingUp,
  User,
  Users,
  Zap,
} from 'lucide-react';
import { EarlyAccessSection } from './components/landing/EarlyAccessSection';
import { FAQSection } from './components/landing/FAQSection';
import { FeaturesSection } from './components/landing/FeaturesSection';
import { Footer } from './components/landing/Footer';
import { GymBenefitsSection } from './components/landing/GymBenefitsSection';
import { Header } from './components/landing/Header';
import { HeroSection } from './components/landing/HeroSection';
import { SocialProofSection } from './components/landing/SocialProofSection';
import { StepsSection } from './components/landing/StepsSection';
import { WhySection } from './components/landing/WhySection';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import type { UserInfo } from './types';

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

const femaleBiologyFeatures = [
  {
    icon: <Zap size={22} />,
    name: 'Generic Apps Miss Female Biology',
    desc: 'Standard training apps ignore your hormonal cycle. Your body responds differently throughout the month - we account for that.',
  },
  {
    icon: <TrendingUp size={22} />,
    name: 'Load Management Matters More',
    desc: 'Smart load management prevents injury and maximizes gains. Your body needs intelligent recovery planning.',
  },
  {
    icon: <Database size={22} />,
    name: "Women's Data is Missing",
    desc: "98% of training research focuses on men. We're building the first female-first training database backed by women's science.",
  },
];

const perks = [
  { icon: <Zap size={14} />, text: 'Priority access before public launch' },
  { icon: <Activity size={14} />, text: 'Free premium tier for first 500 members' },
  { icon: <Calendar size={14} />, text: 'Early influence on product features' },
  { icon: <Shield size={14} />, text: 'Founding athlete badge on your profile' },
  { icon: <Users size={14} />, text: 'Refer friends - jump 10 spots per referral' },
];

const appFeatures = [
  {
    icon: <Calendar size={22} />,
    name: 'Smart Schedule',
    desc: 'Unify training sessions, matches, physio appointments and rest days into a single adaptive calendar you can search in seconds.',
  },
  {
    icon: <Users size={22} />,
    name: 'Team Availability',
    desc: "See who's available, injured, or travelling at a glance. Coordinate squad logistics without the endless group chat noise.",
  },
  {
    icon: <Activity size={22} />,
    name: 'Recovery Insights',
    desc: 'Track load, HRV, sleep quality and injury history. Avail learns your patterns and flags when you need more recovery time.',
  },
  {
    icon: <Zap size={22} />,
    name: 'Command Mode',
    desc: 'Press Cmd+K and ask anything - "Who\'s free Saturday?", "Show last week\'s sessions", "Book physio". Instant answers.',
  },
  {
    icon: <Shield size={22} />,
    name: 'Private by Design',
    desc: 'Your health and performance data belongs to you. Granular controls over what you share, with coaches and with your team.',
  },
  {
    icon: <Share2 size={22} />,
    name: 'Integrations',
    desc: 'Connects with Strava, Garmin, MyFitnessPal, Notion, Google Calendar and more - wherever your athletic life already lives.',
  },
];

const steps = [
  {
    icon: <User size={22} />,
    name: 'Sync Your Data',
    desc: 'Connect your calendar, wearables, and training history. Avail learns your personal patterns in minutes.',
  },
  {
    icon: <Activity size={22} />,
    name: 'Get Personalized Guidance',
    desc: 'AI-powered training plans adapt to your cycle and recovery. Smart notifications keep you on track.',
  },
  {
    icon: <TrendingUp size={22} />,
    name: 'Optimize & Improve',
    desc: 'Track progress with female-specific metrics. Watch your performance and confidence grow.',
  },
];

const gymBenefits = [
  {
    icon: <Users size={22} />,
    name: 'Empower Your Female Members',
    desc: 'Retain members with cycle-informed training. Reduce injury rates with smart load management. Build loyalty.',
  },
  {
    icon: <TrendingUp size={22} />,
    name: 'Data Insights for Operations',
    desc: 'Understand female member preferences. Optimize class scheduling around female physiology. Build targeted programs.',
  },
  {
    icon: <Share2 size={22} />,
    name: 'Community Integration',
    desc: 'Members form accountability groups. Leaderboards, challenges, and milestones. Build female-focused performance culture.',
  },
];

const quotes = [
  {
    text: "I spend more time coordinating my calendar than I do training. Avail looks like the solution I've been waiting for.",
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
    text: "Every app I've tried was built for men and adapted badly. The fact that Avail is built from scratch for us means everything.",
    name: 'Zara T.',
    role: 'Track & field athlete · London',
    initial: 'Z',
  },
];

const faqs = [
  {
    q: 'What makes Avail different from other fitness apps?',
    a: "Avail is the first performance app specifically designed around female physiology. Every feature - from training programming to load management - is built on women's data and hormonal science, not generic fitness trends.",
  },
  {
    q: 'How does the cycle tracking work? Do I have to sync my calendar?',
    a: 'Cycle tracking is optional and fully private. You can sync your calendar, log manually, or connect wearables. All tracking is encrypted and never shared.',
  },
  {
    q: "What if I don't have a regular cycle or use hormonal contraception?",
    a: "Avail works for everyone. Hormonal contraception changes your cycle patterns - we account for that. Irregular cycles? We adapt. The app's recovery and load management features still apply.",
  },
  {
    q: 'Can I use Avail without a gym membership?',
    a: 'Absolutely. Avail works with any training environment - gyms, home workouts, sports. While we partner with gyms, the core app is designed for independent users too.',
  },
  {
    q: 'What data do you collect and how is it used?',
    a: 'We collect training data and optional cycle information to power personalized recommendations. Your data is encrypted, private, and never sold. We use aggregate data to improve our female-focused training algorithms.',
  },
  {
    q: 'When will the full app launch?',
    a: "We're launching in Q4 2026. Early access members get the app 4 weeks before public launch, plus a lifetime discount. You'll shape the app with your feedback during beta.",
  },
];

function LandingPage() {
  const [status, setStatus] = useState<'join' | 'success' | 'check'>('join');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [referredByCode, setReferredByCode] = useState('');
  const [checkEmail, setCheckEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinedUser, setJoinedUser] = useState<UserInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) setReferredByCode(ref.toUpperCase());

    const code = params.get('code');
    if (code && !params.get('handled')) {
      handleGitHubCallback(code);
    }
  }, []);

  const fireConfetti = () => {
    confetti({
      particleCount: 180,
      spread: 90,
      origin: { y: 0.55 },
      colors: ['#6FBF9E', '#4FA3C7', '#ffffff', '#b7e3d4'],
    });
  };

  const handleGitHubOAuth = () => {
    const redirectUri = encodeURIComponent(window.location.origin);
    const scope = encodeURIComponent('user:email');
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scope}`;
  };

  const handleGitHubCallback = async (code: string) => {
    console.log('GitHub code received:', code);
    window.history.replaceState({}, document.title, '/');
  };

  const handleJoin = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Please fill in all fields.');
      return;
}

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const users = loadWaitlist();
      const normalizedEmail = email.trim().toLowerCase();
      const existing = users.find((user) => user.email === normalizedEmail);

      if (existing) {
        setJoinedUser(existing);
        setStatus('success');
        fireConfetti();
        return;
      }

      const referrer = referredByCode
        ? users.find((user) => user.referralCode === referredByCode.trim().toUpperCase())
        : undefined;

      const updatedUsers = referrer
        ? users.map((user) =>
            user._id === referrer._id
              ? { ...user, referralCount: user.referralCount + 1, queuePosition: Math.max(1, user.queuePosition - 10) }
              : user,
          )
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
      setJoinedUser(user);
      setStatus('success');
      fireConfetti();
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = (event: FormEvent) => {
    event.preventDefault();
    if (!checkEmail.trim()) {
      setError('Please enter your email.');
      return;
    }

    setLoading(true);
    setError(null);
    const normalizedEmail = checkEmail.trim().toLowerCase();
    const user = loadWaitlist().find((entry) => entry.email === normalizedEmail);
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

  const handleShowCheck = () => {
    setStatus('check');
    setError(null);
    setCheckEmail('');
  };

  const handleShowJoin = () => {
    setStatus('join');
    setError(null);
  };

  const handleRegisterAnother = () => {
    setStatus('join');
    setName('');
    setEmail('');
    setJoinedUser(null);
    setError(null);
  };

  const referralLink = joinedUser ? `${window.location.origin}?ref=${joinedUser.referralCode}` : '';

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#F7FAF8] text-[#1B1F23]">
      <div className="blob-move pointer-events-none fixed -top-52 -right-24 z-0 size-[600px] rounded-full bg-[#6FBF9E]/12 blur-[80px]" />
      <div className="blob-move-reverse pointer-events-none fixed -bottom-24 -left-36 z-0 size-[500px] rounded-full bg-[#4FA3C7]/10 blur-[80px]" />
      <div className="blob-move-delay pointer-events-none fixed top-[40%] left-[30%] z-0 size-[300px] rounded-full bg-[#6FBF9E]/8 blur-[80px]" />

      <Header />

      <main className="relative z-10">
        <HeroSection />
        <WhySection items={femaleBiologyFeatures} />
        <EarlyAccessSection
          status={status}
          name={name}
          email={email}
          referredByCode={referredByCode}
          checkEmail={checkEmail}
          loading={loading}
          error={error}
          joinedUser={joinedUser}
          copied={copied}
          perks={perks}
          referralLink={referralLink}
          onNameChange={setName}
          onEmailChange={setEmail}
          onCheckEmailChange={setCheckEmail}
          onJoin={handleJoin}
          onCheckStatus={handleCheckStatus}
          onGitHubOAuth={handleGitHubOAuth}
          onCopy={handleCopy}
          onShowCheck={handleShowCheck}
          onShowJoin={handleShowJoin}
          onRegisterAnother={handleRegisterAnother}
        />
        <FeaturesSection items={appFeatures} />
        <SocialProofSection quotes={quotes} />
        <StepsSection items={steps} />
        <GymBenefitsSection items={gymBenefits} />
        <FAQSection
          faqs={faqs}
          expandedFaq={expandedFaq}
          onToggleFaq={(index) => setExpandedFaq(expandedFaq === index ? null : index)}
        />
        <Footer />
      </main>
    </div>
  );
}

export default function App() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';

  if (path === '/privacy') {
    return <PrivacyPage />;
  }

  if (path === '/terms') {
    return <TermsPage />;
  }

  return <LandingPage />;
}
