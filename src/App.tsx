import { useEffect } from 'react';
import { EarlyAccessSection } from './components/landing/EarlyAccessSection';
import { ConsentAwareAnalytics } from './components/ConsentAwareAnalytics';
import { Header } from './components/landing/Header';
import { HeroSection } from './components/landing/HeroSection';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { SuccessPage } from './pages/SuccessPage';

function LandingPage() {
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

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#F7FAF8] text-[#1B1F23]">
      <div className="blob-move pointer-events-none fixed -top-52 -right-24 z-0 size-[600px] rounded-full bg-[#6FBF9E]/12 blur-[80px]" />
      <div className="blob-move-reverse pointer-events-none fixed -bottom-24 -left-36 z-0 size-[500px] rounded-full bg-[#4FA3C7]/10 blur-[80px]" />
      <div className="blob-move-delay pointer-events-none fixed top-[40%] left-[30%] z-0 size-[300px] rounded-full bg-[#6FBF9E]/8 blur-[80px]" />

      <Header />

      <main className="relative z-10 flex flex-col [&>*]:my-[50px]">
        <HeroSection />
        <EarlyAccessSection />
      </main>
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
