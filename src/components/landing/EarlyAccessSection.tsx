import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { STRIPE_PAYMENT_LINK } from '../../lib/payments';
import { pageShell, primaryButtonClass } from './shared';

export function EarlyAccessSection() {
  return (
    <section id="early-access" className={`${pageShell} scroll-mt-24`}>
      <div className="fade-up w-full">
        <div className="mx-auto flex min-h-[640px] w-full flex-col justify-center rounded-[30px] border border-[#17333A]/10 bg-white/78 px-6 py-10 text-center shadow-[0_18px_55px_rgba(23,51,58,0.07)] tablet:px-12 tablet:py-14 air:min-h-[690px]">
          <p className="type-caption font-extrabold tracking-[1.6px] text-[#286D86] uppercase">
            Paid Founding Waitlist
          </p>
          <h2 className="type-section-title mx-auto mt-3 max-w-[700px] font-black text-[#17333A] uppercase">
            Secure early access.<br />Be first to train with Avail.
          </h2>
          <p className="type-body mx-auto mt-5 max-w-[650px] text-[#64707D]">
            Join the paid Founding Waitlist for priority consideration for early access and launch updates.
          </p>

          <div className="mx-auto mt-7 flex max-w-[600px] flex-col justify-center gap-3 text-left text-sm font-bold text-[#405158] tablet:flex-row tablet:gap-7">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={17} className="shrink-0 text-[#38897C]" aria-hidden="true" />
              Stripe securely collects your name and email
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 size={17} className="shrink-0 text-[#38897C]" aria-hidden="true" />
              Only confirmed payments join the waitlist
            </span>
          </div>

          <a href={STRIPE_PAYMENT_LINK} className={`${primaryButtonClass} mx-auto mt-8 max-w-[600px]`}>
            Join the Founding Waitlist · $5 USD <ArrowRight size={16} />
          </a>
          <p className="type-caption mx-auto mt-3 max-w-[900px] text-[#64707D]">
            One-time $5 USD · Stripe may offer an equivalent local-currency amount · Non-refundable, except where required by law
          </p>
        </div>
      </div>
    </section>
  );
}
