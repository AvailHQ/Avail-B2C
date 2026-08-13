import type { ReactNode } from 'react';

export interface FeatureItem {
  icon: ReactNode;
  name: string;
  desc: string;
}

export const gradientText = 'bg-linear-to-r from-[#6FBF9E] to-[#4FA3C7] bg-clip-text text-transparent';
export const pageShell = 'mx-auto w-full max-w-full px-5 tablet:px-8 air:max-w-[1120px] air:px-12 mac:max-w-[1360px] mac:px-14 full-hd:max-w-[1600px] full-hd:px-16 qhd:max-w-[2240px] qhd:px-24 four-k:max-w-[2560px] four-k:px-28';
export const sectionShell = `${pageShell} py-12 lg:py-20`;
export const sectionTitle = 'type-section-title mt-3 mb-4 font-black text-[#1B1F23]';
export const sectionSub = 'type-lead mx-auto max-w-[540px] text-[#64707D]';
export const labelClass = 'type-caption font-extrabold uppercase tracking-[1.5px] text-[#4FA3C7]';
export const cardClass = 'rounded-2xl border border-black/6 bg-white/85 p-8 shadow-[0_4px_24px_rgba(111,191,158,0.08)] transition duration-300 hover:-translate-y-1 hover:border-[#6FBF9E]/25 hover:shadow-[0_20px_60px_rgba(79,163,199,0.1)]';
export const formInputClass = 'w-full rounded-2xl border border-black/10 bg-[#F4F8FA] py-3.5 pr-4 pl-11 text-base text-[#1B1F23] transition placeholder:text-[#64707D]/50 focus:border-[#4FA3C7] focus:bg-white focus:ring-4 focus:ring-[#4FA3C7]/10 focus:outline-none';
export const primaryButtonClass = 'type-button mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-0 bg-linear-to-r from-[#6FBF9E] to-[#4FA3C7] p-4 font-extrabold tracking-normal text-white shadow-[0_4px_16px_rgba(111,191,158,0.3)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(111,191,158,0.4)] disabled:cursor-not-allowed disabled:opacity-65';

export function FeatureGrid({ items }: { items: FeatureItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {items.map((feature) => (
        <article key={feature.name} className={cardClass}>
          <div className="flex size-[46px] items-center justify-center rounded-xl bg-linear-to-br from-[#6FBF9E]/12 to-[#4FA3C7]/12 text-[#4FA3C7]">
            {feature.icon}
          </div>
          <h3 className="type-feature-title font-extrabold text-[#1B1F23]">{feature.name}</h3>
          <p className="type-body text-[#64707D]">{feature.desc}</p>
        </article>
      ))}
    </div>
  );
}

export function SectionHeader({ label, title, subtitle }: { label?: string; title: ReactNode; subtitle: string }) {
  return (
    <div className="mb-14 text-center">
      {label && <span className={labelClass}>{label}</span>}
      <h2 className={sectionTitle}>{title}</h2>
      <p className={sectionSub}>{subtitle}</p>
    </div>
  );
}
