import { Activity, CalendarHeart, RefreshCw } from 'lucide-react';
import { pageShell } from './shared';

const gaps = [
  {
    icon: CalendarHeart,
    title: 'Training needs change across your cycle',
    body: 'Energy, readiness and recovery can vary throughout the month. Your training context should be able to adapt with you.',
  },
  {
    icon: Activity,
    title: 'Training load is not one-size-fits-all',
    body: 'Generic plans miss the individual patterns behind fatigue, consistency and performance.',
  },
  {
    icon: RefreshCw,
    title: 'Recovery is personal',
    body: 'Your own training and recovery signals deserve more than a formula built around an average athlete.',
  },
] as const;

export function WomenTrainingGapSection() {
  return (
    <section id="why-avail" className={`${pageShell} scroll-mt-24`} aria-labelledby="female-physiology-title">
      <div className="mx-auto max-w-[1040px]">
        <header className="mx-auto mb-9 max-w-[760px] text-center">
          <p className="type-caption font-extrabold tracking-[1.6px] text-[#286D86] uppercase">
            Built with women in mind
          </p>
          <h2 id="female-physiology-title" className="type-section-title mt-3 font-black text-[#17333A]">
            Most training tools overlook female physiology.
          </h2>
          <p className="type-body mx-auto mt-4 max-w-[680px] text-[#64707D]">
            Avail brings cycle context, training load and recovery patterns into one clearer view of your body.
          </p>
        </header>

        <div className="grid gap-4 tablet:grid-cols-3">
          {gaps.map(({ icon: Icon, title, body }) => (
            <article key={title} className="rounded-[22px] border border-[#17333A]/9 bg-white/72 p-6 shadow-[0_12px_36px_rgba(23,51,58,0.055)] tablet:p-7">
              <span className="flex size-11 items-center justify-center rounded-full bg-[#6FBF9E]/16 text-[#28766D]">
                <Icon size={21} aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-lg leading-6 font-extrabold text-[#17333A]">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#64707D]">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
