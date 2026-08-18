import { ArrowRight } from 'lucide-react';
import { STRIPE_PAYMENT_LINK } from '../../lib/payments';
import { gradientText, pageShell, primaryButtonClass } from './shared';

export function HeroSection() {
  return (
    <section
      className={`${pageShell} flex flex-col justify-center pt-28 text-center lg:pt-32`}
    >
      <p className="type-caption fade-up fade-up-delay-1 mb-5 font-extrabold tracking-[1.8px] text-[#286D86] uppercase">
        Performance, built for women
      </p>

      <h1 className="fade-up fade-up-delay-1 mx-auto mb-6 max-w-[900px] text-[clamp(2.5rem,1.75rem+3.7vw,5.125rem)] leading-[1.02] font-black tracking-[-0.035em] text-[#1B1F23]">
        Learn Your Body.
        <br />
        <span className={gradientText}>Be Stronger. Train Smarter.</span>
      </h1>

      <p className="type-lead fade-up fade-up-delay-2 mx-auto mb-9 max-w-[680px] font-normal text-[#56646B]">
        Training guidance designed around female physiology, your cycle and real
        performance data.
      </p>

      <div className="fade-up fade-up-delay-3 mx-auto w-full max-w-[560px]">
        <a href={STRIPE_PAYMENT_LINK} className={primaryButtonClass}>
          Join the Founding Waitlist &middot; &pound;3 <ArrowRight size={16} />
        </a>
        <p className="type-caption mt-3 text-[#64707D]">
          One-time payment &middot; Stripe-secured checkout
        </p>
      </div>
    </section>
  );
}
