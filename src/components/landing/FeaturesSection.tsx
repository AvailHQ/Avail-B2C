import { ArrowUpRight } from 'lucide-react';
import performanceImage from '../../assets/gym-strength-training.png';
import type { FeatureItem } from './shared';
import { gradientText, labelClass, pageShell } from './shared';

export function FeaturesSection({ items }: { items: FeatureItem[] }) {
  return (
    <section id="features" className={`${pageShell} scroll-mt-24`} aria-labelledby="features-title">
      <div className="relative min-h-[640px] overflow-hidden rounded-[30px] bg-[#173d3c] shadow-[0_28px_80px_rgba(25,59,58,0.16)] air:min-h-[690px]">
        <img
          src={performanceImage}
          alt="Female athlete strength training in a bright gym"
          className="absolute inset-0 size-full object-cover object-[62%_center]"
        />
        <div className="absolute inset-0 bg-[#102c2b]/50" />

        <div className="relative z-10 flex min-h-[640px] flex-col p-6 text-white tablet:p-9 air:min-h-[690px] air:p-12 mac:p-14">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 rounded-full border border-white/30 bg-white/90 px-4 py-2 text-[#1B1F23] shadow-sm backdrop-blur-md">
              <span className="type-caption rounded-full bg-[#6FBF9E]/15 px-2.5 py-1 font-extrabold uppercase tracking-[1px] text-[#4FA3C7]">
                Performance
              </span>
              <span className="type-button font-bold text-[#1B1F23]">Built for female athletes</span>
            </div>
            <a
              href="#early-access"
              className="flex items-center gap-2 rounded-full border border-white/30 bg-white/18 px-4 py-2 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white hover:text-[#1B1F23] tablet:text-sm"
            >
              Join early access
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>

          <div className="mt-auto grid items-end gap-8 air:grid-cols-[0.8fr_1.2fr] air:gap-12">
            <div className="max-w-[500px]">
              <p className={`${labelClass} !text-[#6FBF9E]`}>What Avail Does</p>
              <h2 id="features-title" className="mt-4 text-[clamp(2.25rem,4vw,4.5rem)] leading-[0.98] font-black tracking-[-0.035em] text-white">
                Your whole athletic life,
                <span className={`mt-1 block ${gradientText}`}>in one place.</span>
              </h2>
              <p className="type-body mt-5 max-w-[440px] text-white/80">
                Training, recovery and team coordination—connected around the way your body actually performs.
              </p>
            </div>

            <div className="grid gap-3 tablet:grid-cols-2 air:gap-4">
              {items.map((feature) => (
                <article
                  key={feature.name}
                  className="group flex min-w-0 items-center gap-3 rounded-full border border-white/55 bg-white/92 py-2.5 pr-5 pl-3 text-[#1B1F23] shadow-[0_10px_30px_rgba(8,34,34,0.15)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:bg-white"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#6FBF9E]/15 text-[#4FA3C7] transition group-hover:bg-[#6FBF9E]/25">
                    {feature.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="type-button truncate font-extrabold text-[#1B1F23]">{feature.name}</h3>
                    <p className="type-caption truncate text-[#64707D]">{feature.desc}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
