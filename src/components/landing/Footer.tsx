import { ArrowUpRight, Mail } from 'lucide-react';
import crunchWomanBackground from '../../assets/footer-crunch-woman-wide.png';
import { pageShell } from './shared';

const contactEmail = 'hello@myavail.co.uk';

const productLinks = [
  { label: 'Early access', href: '/#early-access' },
  { label: 'How Avail works', href: '/#features' },
  { label: "Who it's for", href: '/#audiences' },
  { label: 'FAQs', href: '/#faq' },
];

export function Footer() {
  return (
    <footer
      id="site-footer"
      className="relative z-10 mt-[50px] scroll-mt-20 overflow-hidden bg-[#102825] bg-cover bg-center text-white"
      style={{ backgroundImage: `url(${crunchWomanBackground})`, backgroundPosition: 'center' }}
    >
      <div className="absolute inset-0 bg-[#102825]/76" aria-hidden="true" />
      <div className={`${pageShell} relative grid gap-12 py-14 tablet:py-16 air:grid-cols-[minmax(0,1.75fr)_minmax(150px,0.55fr)_minmax(190px,0.7fr)] air:gap-16 air:py-20`}>
        <div className="max-w-[720px]">
          <a href="/" className="inline-flex items-center gap-3" aria-label="MyAvail home">
            <img src="/logo.svg" alt="" className="h-10 w-auto" />
            <span className="text-3xl font-black tracking-[-0.03em] text-white">MyAvail</span>
          </a>

          <p className="mt-5 max-w-[610px] text-base leading-7 text-white/72">
            Building smarter training and recovery around female physiology. Have a question, an idea, or want to work with us?
          </p>

          <div className="mt-9 flex max-w-[640px] flex-col gap-4 tablet:flex-row tablet:items-end">
            <a
              href={`mailto:${contactEmail}`}
              className="group flex min-h-12 flex-1 items-center gap-3 border-b border-white/40 pb-3 text-base font-bold transition hover:border-[#6FBF9E]"
            >
              <Mail size={19} aria-hidden="true" />
              <span>{contactEmail}</span>
            </a>
            <a
              href={`mailto:${contactEmail}`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-linear-to-r from-[#6FBF9E] to-[#4FA3C7] px-8 font-extrabold text-white shadow-[0_8px_24px_rgba(79,163,199,0.2)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(79,163,199,0.28)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4FA3C7]"
            >
              Contact us
              <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          </div>
        </div>

        <nav aria-label="Footer product navigation">
          <h2 className="text-base font-black text-white">Explore</h2>
          <ul className="mt-5 space-y-3.5 text-sm text-white/68">
            {productLinks.map((link) => (
              <li key={link.label}>
                <a href={link.href} className="transition hover:text-white hover:underline hover:underline-offset-4">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-base font-black text-white">Work with us</h2>
          <p className="mt-5 text-sm leading-6 text-white/68">
            For gym partnerships, athlete collaborations, and press enquiries.
          </p>
          <a
            href={`mailto:${contactEmail}?subject=Partnership enquiry`}
            className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-white underline decoration-[#6FBF9E] decoration-2 underline-offset-4 transition hover:decoration-[#4FA3C7]"
          >
            Start a conversation
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="relative border-t border-white/15 bg-[#081B16]/55 backdrop-blur-sm">
        <div className={`${pageShell} flex flex-col gap-5 py-6 text-xs text-white/60 tablet:flex-row tablet:items-center tablet:justify-between`}>
          <p>© 2026 MyAvail. Built around female physiology.</p>
          <nav aria-label="Legal navigation" className="flex flex-wrap gap-x-7 gap-y-3">
            <a href="/privacy" className="transition hover:text-white hover:underline hover:underline-offset-4">Privacy policy</a>
            <a href="/terms" className="transition hover:text-white hover:underline hover:underline-offset-4">Terms of service</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
