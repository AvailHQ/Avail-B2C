import type { FormEvent } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Mail,
  RefreshCw,
  Share2,
  Users,
} from 'lucide-react';
import type { UserInfo } from '../../types';
import { formInputClass, gradientText, pageShell, primaryButtonClass } from './shared';

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
  referralLink: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onCheckEmailChange: (value: string) => void;
  onJoin: (event: FormEvent) => void;
  onCheckStatus: (event: FormEvent) => void;
  onCopy: () => void;
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
  referralLink,
  onNameChange,
  onEmailChange,
  onCheckEmailChange,
  onJoin,
  onCheckStatus,
  onCopy,
  onShowJoin,
  onRegisterAnother,
}: EarlyAccessSectionProps) {
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
          <div className="type-caption mb-5 flex items-center gap-2.5 rounded-lg border border-[#E07070]/25 bg-[#E07070]/7 px-4 py-3 text-[#c0565a]">
            <AlertTriangle size={16} className="shrink-0" />
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
                  className="type-body w-full rounded-2xl border border-[#17333A]/18 bg-white/75 px-6 py-4 text-[#1B1F23] transition placeholder:text-[#64707D]/75 focus:border-[#4FA3C7] focus:bg-white focus:ring-4 focus:ring-[#4FA3C7]/10 focus:outline-none"
                  required
                />
              </label>

              <label>
                <span className="sr-only">Email address</span>
                <input
                  id="join-email"
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(event) => onEmailChange(event.target.value)}
                  className="type-body w-full rounded-2xl border border-[#17333A]/18 bg-white/75 px-6 py-4 text-[#1B1F23] transition placeholder:text-[#64707D]/75 focus:border-[#4FA3C7] focus:bg-white focus:ring-4 focus:ring-[#4FA3C7]/10 focus:outline-none"
                  required
                />
              </label>

              {referredByCode && (
                <div className="type-caption flex items-center gap-2 rounded-lg border border-[#6FBF9E]/20 bg-[#6FBF9E]/8 px-3.5 py-2.5 font-semibold text-[#6FBF9E]">
                  <Users size={14} />
                  Referred by <strong>{referredByCode}</strong> - leapfrog boost active!
                </div>
              )}

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

            <div className="mt-7 text-center text-[#647B80]">
              <p className="type-body flex items-center justify-center gap-2">
                <span className="inline-flex size-6 shrink-0 items-center justify-center text-[#4A8FA8]">
                  <Users size={18} aria-hidden="true" />
                </span>
                <span>
                  <strong className="font-black text-[#17333A]">347</strong> founding athletes have already joined
                </span>
              </p>
              <p className="type-body mt-1">Priority access. Two months fully credited. Limited places.</p>
            </div>
          </>
        )}

        {status === 'check' && (
          <>
            <h2 className="type-feature-title mb-1 font-extrabold text-[#1B1F23]">Check your position</h2>
            <p className="type-body mb-8 text-[#64707D]">Enter your registration email to retrieve your queue rank and share link.</p>

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
              className="type-button mt-5 inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent font-bold text-[#4FA3C7] transition hover:text-[#6FBF9E] hover:underline"
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
              <p className="type-body text-[#64707D]">Your place is ready for checkout. Payment will be enabled when the secure checkout is connected.</p>
            </div>

            <div className="flex w-full overflow-hidden rounded-2xl border border-black/6 bg-[#F4F8FA]">
              {[
                [`#${joinedUser.queuePosition}`, 'Queue Rank'],
                [joinedUser.referralCount, 'Referrals'],
                ['+10', 'Per Referral'],
              ].map(([value, label], index) => (
                <div key={label} className={`flex flex-1 flex-col items-center px-2 py-5 ${index > 0 ? 'border-l border-black/6' : ''}`}>
                  <span className={`${gradientText} type-section-title font-black`}>{value}</span>
                  <span className="type-caption mt-1 font-bold tracking-[0.5px] text-[#64707D] uppercase">{label}</span>
                </div>
              ))}
            </div>

            <div className="w-full text-left">
              <p className="type-caption mb-2 font-bold tracking-[0.5px] text-[#1B1F23] uppercase">Your Referral Link</p>
              <div className="flex w-full gap-2">
                <input
                  className="type-caption min-w-0 flex-1 overflow-hidden rounded-2xl border border-black/10 bg-[#F4F8FA] px-4 py-3 font-mono text-ellipsis whitespace-nowrap text-[#1B1F23]"
                  value={referralLink}
                  readOnly
                  title={referralLink}
                />
                <button
                  className="type-button flex cursor-pointer items-center gap-1.5 rounded-2xl border-0 bg-[#1B1F23] px-5 py-3 font-bold whitespace-nowrap text-white transition hover:bg-[#2b323b]"
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
                className="type-button flex items-center justify-center gap-2 rounded-lg border border-black/10 bg-white p-3 font-bold text-[#1B1F23] transition hover:border-[#64707D] hover:bg-[#F4F8FA]"
              >
                <Share2 size={14} /> Share on X
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="type-button flex items-center justify-center gap-2 rounded-lg border border-black/10 bg-white p-3 font-bold text-[#1B1F23] transition hover:border-[#64707D] hover:bg-[#F4F8FA]"
              >
                <Users size={14} /> LinkedIn
              </a>
            </div>

            <button
              className="type-button inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent font-bold text-[#4FA3C7] transition hover:text-[#6FBF9E] hover:underline"
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
