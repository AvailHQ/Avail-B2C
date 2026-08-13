import { useState } from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import independentAthleteImage from '../../assets/audience-independent-athlete-wide.png';
import gymGirlImage from '../../assets/audience-gym-girl-wide.png';
import teamPlayerImage from '../../assets/audience-team-player-wide.png';
import { pageShell } from './shared';

const audiences = [
  {
    id: 'independent-athlete',
    name: 'Independent Athlete',
    context: 'Running · Cycling · Endurance',
    footer: 'Train on your terms',
    image: independentAthleteImage,
    imageAlt: 'Independent female runner captured mid-stride on an athletics track',
    eyebrow: 'Built around your rhythm',
    title: 'A smarter plan for every session you own.',
    description: 'Plan every session around your schedule, recovery and cycle so you always know when to push or adapt.',
    benefits: ['Personalised training guidance', 'Recovery-aware scheduling', 'Your data, always private'],
  },
  {
    id: 'gym-girl',
    name: 'Gym Girl',
    context: 'Strength · Hypertrophy · Classes',
    footer: 'Lift with confidence',
    image: gymGirlImage,
    imageAlt: 'Female athlete performing a kettlebell swing in a functional training gym',
    eyebrow: 'Strength that works with you',
    title: 'Make every gym session count.',
    description: 'Match every lift to your energy and recovery, building strength consistently without overdoing it.',
    benefits: ['Cycle-informed load guidance', 'Progress beyond the scale', 'Smarter rest and recovery'],
  },
  {
    id: 'team-player',
    name: 'Team Player',
    context: 'Football · Rugby · Team sport',
    footer: 'Show up ready',
    image: teamPlayerImage,
    imageAlt: 'Female football player changing direction while dribbling on a community pitch',
    eyebrow: 'Ready for every team moment',
    title: 'Coordinate the athlete behind the player.',
    description: 'Balance training, matches and recovery in one view so you can manage your load and show up ready.',
    benefits: ['Match and training readiness', 'Shared availability without oversharing', 'Load management across the week'],
  },
] as const;

export function GymBenefitsSection() {
  const [activeId, setActiveId] = useState<(typeof audiences)[number]['id']>('gym-girl');

  return (
    <section id="audiences" className={`${pageShell} scroll-mt-24`} aria-labelledby="audience-title">
      <div className="mb-9 text-center air:mb-12">
        <p className="type-caption font-extrabold uppercase tracking-[1.5px] text-[#4A9B91]">Who Avail is for</p>
        <h2 id="audience-title" className="mt-3 text-[clamp(2.1rem,3.2vw,3.7rem)] leading-[1.02] font-black tracking-[-0.03em] text-[#1B1F23]">
          Built for every way you train.
        </h2>
        <p className="mx-auto mt-4 max-w-[620px] text-sm leading-6 text-[#64707D] tablet:text-base">
          Whether you train alone, lift in the gym or compete with a team, Avail adapts to the athlete you are.
        </p>
      </div>

      <div className="flex flex-col gap-4 air:h-[470px] air:flex-row" role="list" aria-label="Choose your athlete type">
        {audiences.map((audience) => {
          const isActive = audience.id === activeId;
          const panelId = `${audience.id}-details`;

          return (
            <article
              key={audience.id}
              role="listitem"
              className={`relative overflow-hidden rounded-[22px] border bg-[#173D3C] transition-[flex,border-color,box-shadow] duration-500 ease-out ${
                isActive
                  ? 'border-[#6FC5B1] shadow-[0_18px_48px_rgba(39,93,87,0.16)] air:flex-[2.25]'
                  : 'border-black/7 air:flex-1'
              }`}
            >
              <img src={audience.image} alt={audience.imageAlt} className="absolute inset-0 size-full object-cover object-left" />
              <div className="pointer-events-none absolute inset-0 bg-black/30" />
              <div className={`pointer-events-none absolute inset-0 transition-colors duration-500 ${isActive ? 'bg-[#102A28]/28' : 'bg-[#102A28]/22'}`} />
              <div className="flex flex-col air:h-full air:w-[640px] air:min-w-[640px] air:flex-row">
                <button
                  type="button"
                  aria-expanded={isActive}
                  aria-controls={panelId}
                  aria-label={`Show ${audience.name} details`}
                  onClick={() => setActiveId(audience.id)}
                  className="group relative z-10 h-[330px] w-full shrink-0 cursor-pointer overflow-hidden text-left focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-[#4FA3C7] air:h-full air:w-[275px]"
                >
                  <div className="relative z-10 flex h-full flex-col p-5">
                    <div>
                      <h3 className="text-xl leading-tight font-extrabold text-white drop-shadow-sm">{audience.name}</h3>
                      <p className="mt-1 text-sm font-medium text-white/78 drop-shadow-sm">{audience.context}</p>
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-3">
                      <span className="text-base font-extrabold text-white drop-shadow-sm">{audience.footer}</span>
                      <span className={`flex size-11 shrink-0 items-center justify-center rounded-full border bg-white/94 shadow-sm transition duration-300 ${isActive ? 'rotate-45 border-[#6FC5B1] text-[#28766D]' : 'border-white/65 text-[#1B1F23]'}`} aria-hidden="true">
                        <ArrowUpRight size={20} />
                      </span>
                    </div>
                  </div>
                </button>

                <div
                  id={panelId}
                  aria-hidden={!isActive}
                  className={`relative z-20 w-full overflow-hidden border-t border-white/18 bg-[#102A28]/60 backdrop-blur-[2px] air:h-full air:w-[365px] air:shrink-0 air:border-t-0 air:border-l ${
                    isActive ? 'h-auto' : 'h-0 air:h-full'
                  }`}
                >
                  <div className="flex min-h-[330px] w-full flex-col justify-center p-6 air:h-full air:min-h-0 air:p-7">
                    <p className="type-caption font-extrabold uppercase tracking-[1.3px] text-[#8FDDCA]">{audience.eyebrow}</p>
                    <h4 className="mt-3 text-[clamp(1.55rem,1.8vw,2.2rem)] leading-[1.05] font-black tracking-[-0.025em] text-white">{audience.title}</h4>
                    <p className="mt-4 text-sm leading-6 text-white/76">{audience.description}</p>
                    <ul className="mt-5 space-y-2.5">
                      {audience.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-center gap-2.5 text-sm font-bold text-white/90">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#BFE9DD] text-[#28766D]">
                            <Check size={14} strokeWidth={3} aria-hidden="true" />
                          </span>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
