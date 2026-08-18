import { pageShell } from './shared';
import { trackIfConsented } from '../../lib/analytics';

export function Header({ quiet = false }: { quiet?: boolean }) {
  return (
    <header className="fixed top-0 right-0 left-0 z-50 bg-[#F7FAF8]/75 backdrop-blur-xl">
      <nav className={`${pageShell} flex items-center justify-between py-5`}>
        <a href="/" className="flex min-h-11 shrink-0 items-center gap-2.5" aria-label="MyAvail home">
          <img src="/logo.svg" alt="" className="block h-[34px] w-[70px] sm:h-[42px] sm:w-[87px]" />
          <span className="text-lg font-extrabold tracking-normal text-[#1B1F23] sm:text-2xl">MyAvail</span>
        </a>

        {!quiet && <a
          href="/#early-access"
          onClick={() => trackIfConsented('early_access_cta_clicked', { location: 'header' })}
          className="type-button inline-flex h-11 items-center justify-center rounded-full bg-linear-to-r from-[#6FBF9E] to-[#4FA3C7] px-4 font-extrabold whitespace-nowrap text-white shadow-[0_4px_16px_rgba(111,191,158,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(111,191,158,0.32)] sm:px-5"
        >
          <span className="sm:hidden">Join Waitlist</span>
          <span className="hidden sm:inline">Join Founding Waitlist</span>
        </a>}
      </nav>
    </header>
  );
}
