import { gradientText } from './shared';
import { pageShell } from './shared';

export function HeroSection() {
  return (
    <section className={`${pageShell} flex flex-col justify-center pt-28 pb-12 text-center lg:min-h-screen lg:pt-32`}>
      <h1 className="fade-up fade-up-delay-1 mx-auto mb-7 max-w-[900px] text-[clamp(2.8rem,6.5vw,5.5rem)] leading-[1.1] font-black tracking-normal text-[#1B1F23]">
        Be Stronger
        <br />
        <span className={gradientText}>Train Smarter</span>
      </h1>

      <p className="fade-up fade-up-delay-2 mx-auto mb-6 max-w-[620px] text-xl leading-8 font-light text-[#64707D]">
        The first performance app designed around female physiology and women's training data. Train with your cycle, not against it.
      </p>

      <div className="fade-up fade-up-delay-3 flex flex-wrap justify-center gap-8 lg:gap-14">
        {[
          ['500+', 'Beta users'],
          ['+18%', 'Performance gain'],
          ['95%', 'Retention rate'],
        ].map(([value, label], index) => (
          <div key={label} className="flex items-center gap-8 lg:gap-14">
            {index > 0 && <div className="hidden h-12 w-px bg-black/6 sm:block" />}
            <div className="flex flex-col items-center">
              <span className={`${gradientText} text-4xl font-extrabold tracking-normal`}>{value}</span>
              <span className="mt-1 text-xs font-semibold tracking-[0.5px] text-[#64707D] uppercase">{label}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
