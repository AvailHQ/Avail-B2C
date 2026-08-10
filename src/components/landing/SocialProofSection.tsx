import { SectionHeader } from './shared';
import { pageShell } from './shared';

interface Quote {
  text: string;
  name: string;
  role: string;
  initial: string;
}

export function SocialProofSection({ quotes }: { quotes: Quote[] }) {
  return (
    <section className="flex flex-col justify-center bg-linear-to-b from-[#F4F8FA] to-[#F7FAF8] px-6 py-16 text-center sm:px-10 lg:min-h-screen lg:py-20">
      <div className={pageShell}>
        <SectionHeader label="From the Community" title="Athletes who are waiting" subtitle="" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {quotes.map((quote) => (
            <article key={quote.name} className="flex flex-col gap-5 rounded-2xl border border-black/6 bg-white/85 p-7 text-left transition duration-300 hover:-translate-y-1">
              <p className="text-base leading-7 text-[#64707D] italic">"{quote.text}"</p>
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-r from-[#6FBF9E] to-[#4FA3C7] text-sm font-extrabold text-white">
                  {quote.initial}
                </div>
                <div>
                  <div className="text-sm font-bold text-[#1B1F23]">{quote.name}</div>
                  <div className="text-xs text-[#64707D]">{quote.role}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
