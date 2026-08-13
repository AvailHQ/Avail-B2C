import { useEffect, useState } from 'react';
import { Footer } from '../landing/Footer';
import { Header } from '../landing/Header';
import { pageShell } from '../landing/shared';

interface LegalSection {
  id: string;
  heading: string;
  paragraphs: string[];
}

interface LegalPageProps {
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
}

export function LegalPage({ title, intro, updated, sections }: LegalPageProps) {
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? '');

  useEffect(() => {
    let frameId = 0;

    const updateActiveSection = () => {
      const header = document.querySelector('header');
      const headerBottom = header?.getBoundingClientRect().bottom ?? 0;
      const activationLine = headerBottom + 24;
      let nextActiveId = sections[0]?.id ?? '';

      const isNearPageBottom =
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 24;

      if (isNearPageBottom) {
        setActiveSectionId(sections[sections.length - 1]?.id ?? '');
        return;
      }

      for (const sectionItem of sections) {
        const section = document.getElementById(sectionItem.id);
        const heading = document.getElementById(`${sectionItem.id}-heading`);

        if (!section || !heading) continue;

        const sectionRect = section.getBoundingClientRect();

        if (sectionRect.top <= activationLine && sectionRect.bottom > activationLine) {
          nextActiveId = sectionItem.id;
          break;
        }

        if (heading.getBoundingClientRect().top <= activationLine) {
          nextActiveId = sectionItem.id;
        }
      }

      setActiveSectionId(nextActiveId);
    };

    const requestUpdate = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
    };
  }, [sections]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#F7FAF8] text-[#1B1F23]">
      <Header />
      <main className={`${pageShell} pt-32 pb-20 lg:pt-40`}>
        <div className="grid gap-12 lg:max-w-[1180px] lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-16">
          <article className="min-w-0">
            <header className="mb-14">
              <a
                href="/"
                className="mb-8 inline-flex text-sm font-bold text-[#4FA3C7] transition hover:text-[#1B1F23]"
              >
                Back to home
              </a>
              <p className="mb-5 text-xs font-extrabold uppercase tracking-[0.22em] text-[#4FA3C7]">Legal</p>
              <h1 className="type-page-title font-black text-[#1B1F23]">
                {title}
              </h1>
              <p className="type-lead mt-7 max-w-[880px] text-[#64707D]">{intro}</p>
              <p className="mt-5 text-sm font-semibold text-[#64707D]">{updated}</p>
            </header>

            <div className="space-y-12">
              {sections.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-28">
                  <h2 id={`${section.id}-heading`} className="mb-5 text-2xl font-extrabold tracking-[-0.01em] text-[#1B1F23]">{section.heading}</h2>
                  <div className="space-y-5">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph} className="type-body max-w-[760px] text-[#334155]">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </article>

          <aside className="hidden lg:fixed lg:top-28 lg:right-[clamp(2.5rem,11.71875vw,300px)] lg:block lg:w-[300px]">
            <nav className="max-h-[calc(100vh-9rem)] overflow-y-auto rounded-2xl border border-black/6 bg-white/85 p-6 shadow-[0_12px_36px_rgba(15,23,42,0.035)]">
              <h2 className="mb-5 text-lg font-extrabold text-[#1B1F23]">Contents</h2>
              <ol className="space-y-3">
                {sections.map((section, index) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className={`block border-l-2 py-1 pl-4 text-sm font-bold leading-6 transition ${
                        activeSectionId === section.id
                          ? 'border-[#4FA3C7] text-[#4FA3C7]'
                          : 'border-transparent text-[#64707D] hover:border-[#6FBF9E] hover:text-[#1B1F23]'
                      }`}
                      aria-current={activeSectionId === section.id ? 'true' : undefined}
                    >
                      {index + 1}. {section.heading.replace(/^\d+\.\s*/, '')}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
