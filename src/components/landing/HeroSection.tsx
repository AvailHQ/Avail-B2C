import { gradientText } from "./shared";
import { pageShell } from "./shared";

export function HeroSection() {
  return (
    <section
      className={`${pageShell} flex flex-col justify-center pt-28 text-center lg:pt-32`}
    >
      <p className="type-caption fade-up fade-up-delay-1 mb-5 font-extrabold tracking-[1.8px] text-[#286D86] uppercase">
        Performance, built for women
      </p>

      <h1 className="fade-up fade-up-delay-1 mx-auto mb-6 max-w-[900px] text-[clamp(2.5rem,1.75rem+3.7vw,5.125rem)] leading-[1.02] font-black tracking-[-0.035em] text-[#1B1F23]">
        Be Stronger
        <br />
        <span className={gradientText}>Train Smarter</span>
      </h1>

      <p className="type-lead fade-up fade-up-delay-2 mx-auto mb-9 max-w-[680px] font-normal text-[#56646B]">
        The performance app built around female physiology and real training
        data. Train with your cycle, not against it.
      </p>

      <div className="fade-up fade-up-delay-3">
        <div className="mx-auto grid max-w-[760px] grid-cols-3 gap-0">
          {[
            ["500+", "Early users"],
            ["+18%", "Performance gain"],
            ["95%", "Retention rate"],
          ].map(([value, label], index) => (
            <div
              key={label}
              className={`flex min-w-0 flex-col items-center px-2 sm:px-6 ${index > 0 ? "border-l border-black/8" : ""}`}
            >
              <span
                className={`${gradientText} text-2xl leading-none font-extrabold tracking-[-0.02em] sm:text-4xl`}
              >
                {value}
              </span>
              <span className="mt-2 text-[10px] leading-4 font-bold tracking-[0.5px] text-[#56646B] uppercase sm:text-xs sm:tracking-[0.9px]">
                {label}
              </span>
            </div>
          ))}
        </div>
        <p className="type-caption mt-4 text-[#556166]">
          Based on results from early Avail testing.
        </p>
      </div>
    </section>
  );
}
