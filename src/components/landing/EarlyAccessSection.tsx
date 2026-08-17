import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Mail,
  RefreshCw,
  Users,
} from 'lucide-react';
import type { UserInfo } from '../../types';
import { getPublicWaitlistCount } from '../../lib/convex';
import { formInputClass, pageShell, primaryButtonClass } from './shared';

interface EarlyAccessSectionProps {
  status: 'join' | 'success' | 'check';
  name: string;
  email: string;
  consent: boolean;
  checkEmail: string;
  loading: boolean;
  error: string | null;
  fieldErrors: { name?: string; email?: string };
  joinedUser: UserInfo | null;
  paymentUrl: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onConsentChange: (value: boolean) => void;
  onCheckEmailChange: (value: string) => void;
  onJoin: (event: FormEvent) => void;
  onCheckStatus: (event: FormEvent) => void;
  onShowJoin: () => void;
  onRegisterAnother: () => void;
}

export function EarlyAccessSection({
  status,
  name,
  email,
  consent,
  checkEmail,
  loading,
  error,
  fieldErrors,
  joinedUser,
  paymentUrl,
  onNameChange,
  onEmailChange,
  onConsentChange,
  onCheckEmailChange,
  onJoin,
  onCheckStatus,
  onShowJoin,
  onRegisterAnother,
}: EarlyAccessSectionProps) {
  const [foundingAthletesCount, setFoundingAthletesCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getPublicWaitlistCount()
      .then((count) => {
        if (!cancelled) setFoundingAthletesCount(count);
      })
      .catch(() => {
        // Leave the value unavailable instead of inventing a client-side count.
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  return (
    <section id="early-access" className={`${pageShell} scroll-mt-24`}>
      <div className="fade-up mx-auto max-w-[960px]">
        <header className="mb-9 text-center lg:mb-11">
          <h2 className="type-section-title mx-auto max-w-[760px] font-black text-[#17333A] uppercase">
            Secure early access.
            <br />
            Be first to train with Avail.
          </h2>
          <p className="type-body mx-auto mt-5 max-w-[760px] font-normal text-[#64707D]">
            Secure early access to Avail before the public launch.
          </p>
        </header>

        <div className="mx-auto max-w-[760px]">
        {error && (
          <div role="alert" aria-live="assertive" className="type-caption mb-5 flex items-center gap-2.5 rounded-lg border border-[#A63F47]/25 bg-[#A63F47]/7 px-4 py-3 text-[#92363D]">
            <AlertTriangle size={16} className="shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {status === 'join' && (
          <>
            <form onSubmit={onJoin} noValidate className="flex flex-col gap-4">
              <label>
                <span className="sr-only">Full name</span>
                <input
                  id="join-name"
                  type="text"
                  placeholder="Full name"
                  value={name}
                  onChange={(event) => onNameChange(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? 'join-name-error' : undefined}
                  className="type-body w-full rounded-2xl border border-[#17333A]/18 bg-white/75 px-6 py-4 text-[#1B1F23] transition placeholder:text-[#64707D]/75 focus:border-[#4FA3C7] focus:bg-white focus:ring-4 focus:ring-[#4FA3C7]/10 focus:outline-none"
                  required
                />
                {fieldErrors.name && <span id="join-name-error" className="type-caption mt-1.5 block px-2 font-bold text-[#92363D]">{fieldErrors.name}</span>}
              </label>

              <label>
                <span className="sr-only">Email address</span>
                <input
                  id="join-email"
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(event) => onEmailChange(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? 'join-email-error' : undefined}
                  className="type-body w-full rounded-2xl border border-[#17333A]/18 bg-white/75 px-6 py-4 text-[#1B1F23] transition placeholder:text-[#64707D]/75 focus:border-[#4FA3C7] focus:bg-white focus:ring-4 focus:ring-[#4FA3C7]/10 focus:outline-none"
                  required
                />
                {fieldErrors.email && <span id="join-email-error" className="type-caption mt-1.5 block px-2 font-bold text-[#92363D]">{fieldErrors.email}</span>}
              </label>

              <label htmlFor="join-consent" className="flex items-start gap-2.5 text-left">
                <input
                  id="join-consent"
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => onConsentChange(event.target.checked)}
                  className="mt-0.5 size-4 shrink-0 accent-[#4FA3C7]"
                />
                <span className="type-caption text-[#556166]">
                  Email me occasional Avail updates about early access and launch. Optional - unsubscribe anytime.
                </span>
              </label>

              <button
                id="join-submit-btn"
                type="submit"
                disabled={loading}
                className={`${primaryButtonClass} mt-1`}
              >
                {loading ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} /> Securing Spot...
                  </>
                ) : (
                  <>
                    Continue to Founding Access <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-7 text-center text-[#556166]">
              <p className="type-body flex items-center justify-center gap-2">
                <span className="inline-flex size-6 shrink-0 items-center justify-center text-[#286D86]">
                  <Users size={18} aria-hidden="true" />
                </span>
                <span>
                  <strong className="font-black text-[#17333A]">{foundingAthletesCount ?? '—'}</strong> founding athletes have already joined
                </span>
              </p>
              <p className="type-body mt-1">Priority access. Two months of Avail included.</p>
            </div>
          </>
        )}

        {status === 'check' && (
          <>
            <h2 className="type-feature-title mb-1 font-extrabold text-[#1B1F23]">Check your registration</h2>
            <p className="type-body mb-8 text-[#64707D]">Enter your email to confirm whether you are already on the early access list.</p>

            <form onSubmit={onCheckStatus} noValidate className="flex flex-col gap-5">
              <label className="flex flex-col gap-1.5">
                <span className="type-caption font-extrabold tracking-[0.6px] text-[#1B1F23] uppercase">Email Address</span>
                <span className="relative flex items-center">
                  <Mail size={16} className="pointer-events-none absolute left-4 text-[#64707D]/50" />
                  <input
                    id="check-email"
                    type="email"
                    placeholder="sara@example.com"
                    value={checkEmail}
                    onChange={(event) => onCheckEmailChange(event.target.value)}
                    className={formInputClass}
                    required
                  />
                </span>
              </label>

              <button id="check-submit-btn" type="submit" disabled={loading} className={primaryButtonClass}>
                {loading ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} /> Searching...
                  </>
                ) : (
                  <>
                    Find My Spot <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <button
              className="type-button mt-5 inline-flex min-h-11 cursor-pointer items-center gap-1 border-0 bg-transparent font-bold text-[#1F6E92] underline underline-offset-4 transition hover:text-[#285E78]"
              onClick={onShowJoin}
            >
              Back to registration
            </button>
          </>
        )}

        {status === 'success' && joinedUser && (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="flex size-[72px] items-center justify-center rounded-full bg-linear-to-br from-[#6FBF9E]/15 to-[#4FA3C7]/15 text-[#6FBF9E]">
              <CheckCircle2 size={40} />
            </div>

            <div>
              <h2 className="type-feature-title mb-1 font-extrabold text-[#1B1F23]">Your details are saved, {joinedUser.name.split(' ')[0]}.</h2>
              <p className="type-body text-[#64707D]">Reserve your spot to lock in two months of Avail and priority access before launch.</p>
            </div>

            <div className="w-full">
              <a href={paymentUrl} className={primaryButtonClass}>
                Reserve early access &middot; &pound;10 <ArrowRight size={16} />
              </a>
              <p className="type-caption mt-2 text-[#64707D]">One-time &pound;10 &middot; Two months of Avail &middot; Non-refundable</p>
            </div>

            <button
              className="type-button inline-flex min-h-11 cursor-pointer items-center gap-1 border-0 bg-transparent font-bold text-[#1F6E92] underline underline-offset-4 transition hover:text-[#285E78]"
              onClick={onRegisterAnother}
            >
              Register another athlete
            </button>
          </div>
        )}
      </div>
      </div>
    </section>
  );
}
