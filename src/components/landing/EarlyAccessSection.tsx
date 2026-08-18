import { useEffect, useState } from 'react';
import { ArrowRight, CreditCard, ShieldCheck } from 'lucide-react';
import { STRIPE_PAYMENT_LINK } from '../../lib/payments';
import { getFoundingAthleteCount } from '../../lib/convex';
import { gradientText, pageShell, primaryButtonClass } from './shared';

const assurances = [
  {
    icon: CreditCard,
    title: 'Stripe handles the payment',
    body: 'Your name and email are collected securely at checkout. Card details never touch Avail.',
  },
  {
    icon: ShieldCheck,
    title: 'Only confirmed payments count',
    body: 'Your founding place is recorded once Stripe confirms the payment — nothing before that.',
  },
];

export function EarlyAccessSection() {
  const [foundingCount, setFoundingCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getFoundingAthleteCount()
      .then((count) => {
        if (!cancelled) setFoundingCount(count);
      })
      // Social proof is decorative: on failure the line is simply omitted.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="early-access" className={`${pageShell} scroll-mt-24`}>
      <div className="fade-up w-full">
        <div className="mx-auto flex w-full flex-col justify-center rounded-[22px] border border-[#17333A]/9 bg-white/72 px-6 py-14 text-center shadow-[0_12px_36px_rgba(23,51,58,0.055)] tablet:px-12 tablet:py-16">
          <p className="type-caption font-extrabold tracking-[1.6px] text-[#286D86] uppercase">
            Paid Founding Waitlist
          </p>

          <h2 className="type-section-title fade-up fade-up-delay-1 mx-auto mt-3 max-w-[700px] font-black text-[#17333A]">
            Secure early access.
            <span className={`mt-1 block ${gradientText}`}>Be first to train with Avail.</span>
          </h2>

          <p className="type-body fade-up fade-up-delay-2 mx-auto mt-5 max-w-[680px] text-[#64707D]">
            Join the paid Founding Waitlist for priority consideration for early access and launch
            updates.
          </p>

          <div className="fade-up fade-up-delay-2 mx-auto mt-9 grid w-full max-w-[760px] gap-4 text-left tablet:grid-cols-2">
            {assurances.map(({ icon: Icon, title, body }) => (
              <article
                key={title}
                className="rounded-[22px] border border-[#17333A]/9 bg-white/72 p-6 shadow-[0_12px_36px_rgba(23,51,58,0.055)]"
              >
                <span className="flex size-11 items-center justify-center rounded-full bg-[#6FBF9E]/16 text-[#28766D]">
                  <Icon size={21} aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-lg leading-6 font-extrabold text-[#17333A]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#64707D]">{body}</p>
              </article>
            ))}
          </div>

          <div className="fade-up fade-up-delay-3 mx-auto mt-10 w-full max-w-[600px]">
            {foundingCount !== null && (
              <p className="type-caption mb-4 font-bold tracking-[0.4px] text-[#556166]">
                <span className={`${gradientText} text-base font-extrabold tabular-nums`}>
                  {foundingCount.toLocaleString('en-GB')}
                </span>{' '}
                founding athletes have already joined
              </p>
            )}

            <a href={STRIPE_PAYMENT_LINK} className={primaryButtonClass}>
              Join the Founding Waitlist · £3.50 GBP <ArrowRight size={16} aria-hidden="true" />
            </a>

            <p className="type-caption mx-auto mt-3 max-w-[680px] text-[#64707D]">
              One-time £3.50 GBP · Stripe may offer an equivalent local-currency amount ·
              Non-refundable, except where required by law
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
