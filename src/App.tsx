import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import confetti from 'canvas-confetti';
import {
  Activity,
  Calendar,
  Share2,
  Shield,
} from 'lucide-react';
import { EarlyAccessSection } from './components/landing/EarlyAccessSection';
import { ConsentAwareAnalytics } from './components/ConsentAwareAnalytics';
import { FAQSection } from './components/landing/FAQSection';
import { FeaturesSection } from './components/landing/FeaturesSection';
import { Footer } from './components/landing/Footer';
import { GymBenefitsSection } from './components/landing/GymBenefitsSection';
import { Header } from './components/landing/Header';
import { HeroSection } from './components/landing/HeroSection';
import { WomenTrainingGapSection } from './components/landing/WomenTrainingGapSection';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { SuccessPage } from './pages/SuccessPage';
import type { UserInfo } from './types';
import { trackIfConsented } from './lib/analytics';
import { joinWaitlist } from './lib/convex';
import { paymentLinkForEmail } from './lib/payments';
import { quickValidateEmail } from './lib/emailValidation';

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

const appFeatures = [
  {
    icon: <Calendar size={22} />,
    name: 'Smart Schedule',
    desc: 'Unify training sessions, matches, physio appointments and rest days into a single adaptive calendar you can search in seconds.',
  },
  {
    icon: <Activity size={22} />,
    name: 'Recovery Insights',
    desc: 'Track load, HRV, sleep quality and injury history. Avail learns your patterns and flags when you need more recovery time.',
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
  const [consent, setConsent] = useState(false);
  const [checkEmail, setCheckEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string }>({});
  const [joinedUser, setJoinedUser] = useState<UserInfo | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => {
    const scrollToHashTarget = () => {
      const id = window.location.hash.slice(1);
      const target = id ? document.getElementById(id) : null;
      if (!target) return;

      const headerHeight = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
      const targetTop = target.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: Math.max(0, targetTop - headerHeight - 24), behavior: 'smooth' });
    };

    const frameId = window.requestAnimationFrame(() => window.requestAnimationFrame(scrollToHashTarget));
    window.addEventListener('hashchange', scrollToHashTarget);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('hashchange', scrollToHashTarget);
    };
  }, []);

  const fireConfetti = () => {
    confetti({
      particleCount: 180,
      spread: 90,
      origin: { y: 0.55 },
      colors: ['#6FBF9E', '#4FA3C7', '#ffffff', '#b7e3d4'],
    });
  };

  const handleJoin = async (event: FormEvent) => {
    event.preventDefault();
    const nextFieldErrors: { name?: string; email?: string } = {};
    if (!name.trim()) nextFieldErrors.name = 'Enter your full name.';
    if (!email.trim()) nextFieldErrors.email = 'Enter your email address.';

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError('Please check the highlighted fields.');
      window.requestAnimationFrame(() => {
        document.getElementById(nextFieldErrors.name ? 'join-name' : 'join-email')?.focus();
      });
      return;
    }

    const emailProblem = quickValidateEmail(email);
    if (emailProblem) {
      setFieldErrors({ email: emailProblem });
      setError(emailProblem);
      window.requestAnimationFrame(() => document.getElementById('join-email')?.focus());
      return;
    }

    setLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      const normalizedEmail = email.trim().toLowerCase();

      // Server-side validating join (also sends the welcome email).
      // Returns null when Convex is not configured — then we run local-only.
      const params = new URLSearchParams(window.location.search);
      const result = await joinWaitlist({
        name: name.trim(),
        email: normalizedEmail,
        marketingConsent: consent,
        utmSource: params.get('utm_source') ?? undefined,
        utmMedium: params.get('utm_medium') ?? undefined,
        utmCampaign: params.get('utm_campaign') ?? undefined,
        referrer: document.referrer || undefined,
      }).catch(() => null);

      // Server rejected the email (fake / undeliverable) — surface and stop.
      if (result && !result.success) {
        const message = result.error ?? 'Please check your email address.';
        setFieldErrors({ email: message });
        setError(message);
        window.requestAnimationFrame(() => document.getElementById('join-email')?.focus());
        return;
      }

      const users = loadWaitlist();
      const existing = users.find((user) => user.email === normalizedEmail);
      const user: UserInfo = existing ?? {
        _id: crypto.randomUUID(),
        name: name.trim(),
        email: normalizedEmail,
      };
      if (!existing) {
        saveWaitlist([...users, user]);
      }

      trackIfConsented('waitlist_joined');
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

  const handleShowJoin = () => {
    setStatus('join');
    setError(null);
  };

  const handleRegisterAnother = () => {
    setStatus('join');
    setName('');
    setEmail('');
    setConsent(false);
    setJoinedUser(null);
    setError(null);
    setFieldErrors({});
  };

  const paymentUrl = joinedUser ? paymentLinkForEmail(joinedUser.email) : '';

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#F7FAF8] text-[#1B1F23]">
      <div className="blob-move pointer-events-none fixed -top-52 -right-24 z-0 size-[600px] rounded-full bg-[#6FBF9E]/12 blur-[80px]" />
      <div className="blob-move-reverse pointer-events-none fixed -bottom-24 -left-36 z-0 size-[500px] rounded-full bg-[#4FA3C7]/10 blur-[80px]" />
      <div className="blob-move-delay pointer-events-none fixed top-[40%] left-[30%] z-0 size-[300px] rounded-full bg-[#6FBF9E]/8 blur-[80px]" />

      <Header />

      <main className="relative z-10 flex flex-col [&>*]:my-[50px]">
        <HeroSection />
        <EarlyAccessSection
          status={status}
          name={name}
          email={email}
          consent={consent}
          checkEmail={checkEmail}
          loading={loading}
          error={error}
          fieldErrors={fieldErrors}
          joinedUser={joinedUser}
          paymentUrl={paymentUrl}
          onNameChange={setName}
          onEmailChange={setEmail}
          onConsentChange={setConsent}
          onCheckEmailChange={setCheckEmail}
          onJoin={handleJoin}
          onCheckStatus={handleCheckStatus}
          onShowJoin={handleShowJoin}
          onRegisterAnother={handleRegisterAnother}
        />
        <FeaturesSection items={appFeatures} />
        <GymBenefitsSection />
        <WomenTrainingGapSection />
        <FAQSection
          faqs={faqs}
          expandedFaq={expandedFaq}
          onToggleFaq={(index) => setExpandedFaq(expandedFaq === index ? null : index)}
        />
      </main>
      <Footer />
    </div>
  );
}

function useEntranceAnimations() {
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>('main > section:not(:first-child), main article > header, main article > div > section, main + footer'),
    );

    if (reducedMotion || !('IntersectionObserver' in window)) {
      targets.forEach((target) => target.classList.add('reveal-visible'));
      return;
    }

    targets.forEach((target) => target.classList.add('reveal-on-scroll'));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('reveal-visible');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -7% 0px' },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);
}

export default function App() {
  useEntranceAnimations();
  const path = window.location.pathname.replace(/\/$/, '') || '/';

  const page = path === '/privacy'
    ? <PrivacyPage />
    : path === '/terms'
      ? <TermsPage />
      : path === '/success'
        ? <SuccessPage />
        : <LandingPage />;

  return (
    <>
      {page}
      <ConsentAwareAnalytics />
    </>
  );
}
