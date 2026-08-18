import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { STRIPE_PAYMENT_LINK } from '../../lib/payments';
import { pageShell, primaryButtonClass } from './shared';

export function EarlyAccessSection() {
  return (
    <section id="early-access" className={`${pageShell} scroll-mt-24`}>
      <div className="fade-up mx-auto max-w-[820px] rounded-[28px] border border-[#17333A]/10 bg-white/72 px-6 py-10 text-center shadow-[0_18px_50px_rgba(23,51,58,0.08)] backdrop-blur-sm tablet:px-12 tablet:py-14">
        <p className="type-caption font-extrabold tracking-[1.6px] text-[#286D86] uppercase">
          Founding Waitlist
        </p>
        <h2 className="type-section-title mx-auto mt-3 max-w-[680px] font-black text-[#17333A] uppercase">
          Be first in line for Avail.
        </h2>
        <p className="type-body mx-auto mt-5 max-w-[640px] text-[#64707D]">
          Secure a paid place on the Founding Waitlist and receive priority consideration for early access and launch updates.
        </p>

        <div className="mx-auto mt-7 grid max-w-[580px] gap-3 text-left tablet:grid-cols-2">
          {[
            'Stripe collects your name and email securely',
            'Only confirmed payments join the waitlist',
          ].map((item) => (
            <div key={item} className="flex items-start gap-2.5 text-sm font-bold text-[#445258]">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#479F87]" aria-hidden="true" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <a href={STRIPE_PAYMENT_LINK} className={`${primaryButtonClass} mx-auto mt-8 max-w-[580px]`}>
          Join the Founding Waitlist &middot; &pound;3 <ArrowRight size={16} />
        </a>
        <p className="type-caption mt-3 text-[#64707D]">
          One-time &pound;3 &middot; Priority consideration for early access &middot; Non-refundable, except where required by law
        </p>
      </div>
    </section>
  );
}
