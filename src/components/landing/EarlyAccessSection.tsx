import type { FormEvent, ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  GitBranch,
  Mail,
  RefreshCw,
  Share2,
  User,
  Users,
} from 'lucide-react';
import type { UserInfo } from '../../types';
import { formInputClass, gradientText, labelClass, pageShell, primaryButtonClass } from './shared';

interface PerkItem {
  icon: ReactNode;
  text: string;
}

interface EarlyAccessSectionProps {
  status: 'join' | 'success' | 'check';
  name: string;
  email: string;
  referredByCode: string;
  checkEmail: string;
  loading: boolean;
  error: string | null;
  joinedUser: UserInfo | null;
  copied: boolean;
  perks: PerkItem[];
  referralLink: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onCheckEmailChange: (value: string) => void;
  onJoin: (event: FormEvent) => void;
  onCheckStatus: (event: FormEvent) => void;
  onGitHubOAuth: () => void;
  onCopy: () => void;
  onShowCheck: () => void;
  onShowJoin: () => void;
  onRegisterAnother: () => void;
}

export function EarlyAccessSection({
  status,
  name,
  email,
  referredByCode,
  checkEmail,
  loading,
  error,
  joinedUser,
  copied,
  perks,
  referralLink,
  onNameChange,
  onEmailChange,
  onCheckEmailChange,
  onJoin,
  onCheckStatus,
  onGitHubOAuth,
  onCopy,
  onShowCheck,
  onShowJoin,
  onRegisterAnother,
}: EarlyAccessSectionProps) {
  return (
    <section id="early-access" className={`${pageShell} grid scroll-mt-24 grid-cols-1 gap-10 py-20 lg:min-h-screen lg:grid-cols-2 lg:items-center lg:gap-16 lg:pt-28`}>
      <div className="fade-up flex flex-col gap-8">
        <span className={labelClass}>Early Access Waitlist</span>
        <h2 className="text-4xl leading-tight font-extrabold tracking-normal text-[#1B1F23]">
          Perform at your peak, every single day.
        </h2>
        <p className="text-base leading-7 text-[#64707D]">
          Avail aggregates everything - training plans, match schedules, physiotherapy bookings, and team comms - giving you one frictionless space to manage your athletic life.
        </p>

        <ul className="flex list-none flex-col gap-4">
          {perks.map((perk) => (
            <li key={perk.text} className="flex items-start gap-3 text-base leading-6 text-[#64707D]">
              <span className="mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-[#6FBF9E]/12 text-[#6FBF9E]">{perk.icon}</span>
              {perk.text}
            </li>
          ))}
        </ul>
      </div>

      <div className="fade-up fade-up-delay-1 relative overflow-hidden rounded-3xl border border-black/6 bg-white/85 p-6 shadow-[0_4px_24px_rgba(111,191,158,0.08),0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-xl before:absolute before:top-0 before:right-0 before:left-0 before:h-[3px] before:bg-linear-to-r before:from-[#6FBF9E] before:to-[#4FA3C7] before:content-[''] sm:p-10">
        {error && (
          <div className="mb-5 flex items-center gap-2.5 rounded-lg border border-[#E07070]/25 bg-[#E07070]/7 px-4 py-3 text-sm text-[#c0565a]">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {status === 'join' && (
          <>
            <h2 className="mb-1 text-2xl font-extrabold tracking-normal text-[#1B1F23]">Claim your spot</h2>
            <p className="mb-8 text-sm leading-6 text-[#64707D]">Sign up to secure early access and your unique referral link.</p>

            <button
              id="github-signin-btn"
              className="mb-6 flex w-full cursor-pointer items-center justify-center gap-3 rounded-2xl border border-black/6 bg-white p-3.5 text-base font-bold text-[#1B1F23] shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition hover:-translate-y-px hover:border-[#64707D] hover:bg-[#F4F8FA] hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)]"
              onClick={onGitHubOAuth}
            >
              <GitBranch size={18} />
              Continue with GitHub
            </button>

            <div className="mb-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-black/6" />
              <span className="text-xs font-bold tracking-[0.5px] text-[#64707D] uppercase">or with email</span>
              <div className="h-px flex-1 bg-black/6" />
            </div>

            <form onSubmit={onJoin} className="flex flex-col gap-5">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-extrabold tracking-[0.6px] text-[#1B1F23] uppercase">Full Name</span>
                <span className="relative flex items-center">
                  <User size={16} className="pointer-events-none absolute left-4 text-[#64707D]/50" />
                  <input
                    id="join-name"
                    type="text"
                    placeholder="Sara Lindon"
                    value={name}
                    onChange={(event) => onNameChange(event.target.value)}
                    className={formInputClass}
                    required
                  />
                </span>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-extrabold tracking-[0.6px] text-[#1B1F23] uppercase">Email Address</span>
                <span className="relative flex items-center">
                  <Mail size={16} className="pointer-events-none absolute left-4 text-[#64707D]/50" />
                  <input
                    id="join-email"
                    type="email"
                    placeholder="sara@example.com"
                    value={email}
                    onChange={(event) => onEmailChange(event.target.value)}
                    className={formInputClass}
                    required
                  />
                </span>
              </label>

              {referredByCode && (
                <div className="flex items-center gap-2 rounded-lg border border-[#6FBF9E]/20 bg-[#6FBF9E]/8 px-3.5 py-2.5 text-sm font-semibold text-[#6FBF9E]">
                  <Users size={14} />
                  Referred by <strong>{referredByCode}</strong> - leapfrog boost active!
                </div>
              )}

              <button id="join-submit-btn" type="submit" disabled={loading} className={primaryButtonClass}>
                {loading ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} /> Securing Spot...
                  </>
                ) : (
                  <>
                    Secure Early Access <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <button
              className="mt-5 inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent text-sm font-bold text-[#4FA3C7] transition hover:text-[#6FBF9E] hover:underline"
              onClick={onShowCheck}
            >
              Already registered? Check your position
            </button>
          </>
        )}

        {status === 'check' && (
          <>
            <h2 className="mb-1 text-2xl font-extrabold tracking-normal text-[#1B1F23]">Check your position</h2>
            <p className="mb-8 text-sm leading-6 text-[#64707D]">Enter your registration email to retrieve your queue rank and share link.</p>

            <form onSubmit={onCheckStatus} className="flex flex-col gap-5">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-extrabold tracking-[0.6px] text-[#1B1F23] uppercase">Email Address</span>
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
              className="mt-5 inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent text-sm font-bold text-[#4FA3C7] transition hover:text-[#6FBF9E] hover:underline"
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
              <h2 className="mb-1 text-2xl font-extrabold tracking-normal text-[#1B1F23]">You're in, {joinedUser.name.split(' ')[0]}!</h2>
              <p className="text-sm leading-6 text-[#64707D]">You're on the Avail waitlist. Refer other female athletes to climb the queue faster.</p>
            </div>

            <div className="flex w-full overflow-hidden rounded-2xl border border-black/6 bg-[#F4F8FA]">
              {[
                [`#${joinedUser.queuePosition}`, 'Queue Rank'],
                [joinedUser.referralCount, 'Referrals'],
                ['+10', 'Per Referral'],
              ].map(([value, label], index) => (
                <div key={label} className={`flex flex-1 flex-col items-center px-2 py-5 ${index > 0 ? 'border-l border-black/6' : ''}`}>
                  <span className={`${gradientText} text-3xl leading-none font-black tracking-normal`}>{value}</span>
                  <span className="mt-1 text-xs font-bold tracking-[0.5px] text-[#64707D] uppercase">{label}</span>
                </div>
              ))}
            </div>

            <div className="w-full text-left">
              <p className="mb-2 text-xs font-bold tracking-[0.5px] text-[#1B1F23] uppercase">Your Referral Link</p>
              <div className="flex w-full gap-2">
                <input
                  className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-black/10 bg-[#F4F8FA] px-4 py-3 font-mono text-sm text-ellipsis whitespace-nowrap text-[#1B1F23]"
                  value={referralLink}
                  readOnly
                  title={referralLink}
                />
                <button
                  className="flex cursor-pointer items-center gap-1.5 rounded-2xl border-0 bg-[#1B1F23] px-5 py-3 text-sm font-bold whitespace-nowrap text-white transition hover:bg-[#2b323b]"
                  onClick={onCopy}
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Just secured early access to @availapp - the platform built for female athletes. Join me: ${referralLink}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg border border-black/10 bg-white p-3 text-sm font-bold text-[#1B1F23] transition hover:border-[#64707D] hover:bg-[#F4F8FA]"
              >
                <Share2 size={14} /> Share on X
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg border border-black/10 bg-white p-3 text-sm font-bold text-[#1B1F23] transition hover:border-[#64707D] hover:bg-[#F4F8FA]"
              >
                <Users size={14} /> LinkedIn
              </a>
            </div>

            <button
              className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent text-sm font-bold text-[#4FA3C7] transition hover:text-[#6FBF9E] hover:underline"
              onClick={onRegisterAnother}
            >
              Register another athlete
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
