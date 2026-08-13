import { gradientText } from "./shared";
import { pageShell } from "./shared";

export function HeroSection() {
  return (
    <section
      className={`${pageShell} flex flex-col justify-center pt-28 text-center lg:pt-32`}
    >
      <p className="type-caption fade-up fade-up-delay-1 mb-5 font-extrabold tracking-[1.8px] text-[#4A8FA8] uppercase">
        Performance, built for women
      </p>

      <h1 className="fade-up fade-up-delay-1 mx-auto mb-6 max-w-[900px] text-[clamp(2.5rem,1.75rem+3.7vw,5.125rem)] leading-[1.02] font-black tracking-[-0.035em] text-[#1B1F23]">
        Be Stronger
        <br />
        <span className={gradientText}>Train Smarter</span>
      </h1>

      <p className="type-lead fade-up fade-up-delay-2 mx-auto mb-9 max-w-[680px] font-normal text-[#596775]">
        The performance app built around female physiology and real training
        data. Train with your cycle, not against it.
      </p>

      <div className="fade-up fade-up-delay-3">
        <div className="mx-auto grid max-w-[760px] grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-0">
          {[
            ["500+", "Early users"],
            ["+18%", "Performance gain"],
            ["95%", "Retention rate"],
          ].map(([value, label], index) => (
            <div
              key={label}
              className={`flex flex-col items-center px-6 ${index > 0 ? "sm:border-l sm:border-black/8" : ""}`}
            >
              <span
                className={`${gradientText} text-4xl leading-none font-extrabold tracking-[-0.02em]`}
              >
                {value}
              </span>
              <span className="mt-2 text-xs font-bold tracking-[0.9px] text-[#596775] uppercase">
                {label}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs text-[#64707D]/80">
          Based on results from early Avail testing.
        </p>
      </div>
    </section>
  );
}
