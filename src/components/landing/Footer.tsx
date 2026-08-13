import { useState } from "react";
import { ArrowUpRight, Mail } from "lucide-react";
import crunchWomanBackground from "../../assets/footer-crunch-woman-wide.png";
import { COOKIE_PREFERENCES_KEY, saveCookiePreferences, trackIfConsented } from "../../lib/analytics";
import { pageShell } from "./shared";

const contactEmail = "yash.saxena1@outlook.com";

const productLinks = [
  { label: "Early access", href: "/#early-access" },
  { label: "How Avail works", href: "/#features" },
  { label: "Who it's for", href: "/#audiences" },
  { label: "FAQs", href: "/#faq" },
];

export function Footer() {
  const [hasCookiePreference, setHasCookiePreference] = useState(() => {
    try {
      return window.localStorage.getItem(COOKIE_PREFERENCES_KEY) !== null;
    } catch {
      return false;
    }
  });
  const storeCookiePreferences = (analytics: boolean, marketing: boolean) => {
    saveCookiePreferences(analytics, marketing);
    setHasCookiePreference(true);
  };

  return (
    <>
      <footer
        id="site-footer"
        className="relative z-10 mt-[50px] scroll-mt-20 overflow-hidden bg-[#102825] bg-contain bg-right bg-no-repeat text-white air:bg-cover air:bg-center"
        style={{
          backgroundImage: `url(${crunchWomanBackground})`,
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-[#102825]/76" aria-hidden="true" />
        <div
          className={`${pageShell} relative grid gap-8 py-10 tablet:gap-12 tablet:py-16 air:grid-cols-[minmax(0,1.75fr)_minmax(150px,0.55fr)_minmax(190px,0.7fr)] air:gap-16 air:py-20`}
        >
          <div className="max-w-[720px]">
            <a
              href="/"
              className="inline-flex items-center gap-3"
              aria-label="MyAvail home"
            >
              <img src="/logo.svg" alt="" className="h-10 w-auto" />
              <span className="text-3xl font-black tracking-[-0.03em] text-white">
                MyAvail
              </span>
            </a>

            <p className="mt-5 max-w-[610px] text-base leading-7 text-white/72">
              Building smarter training and recovery around female physiology.
              Have a question, an idea, or want to work with us?
            </p>

            <div className="mt-9 flex max-w-[640px] flex-col gap-4 tablet:flex-row tablet:items-end">
              <a
                href={`mailto:${contactEmail}`}
                onClick={() => trackIfConsented('contact_clicked', { location: 'footer_email' })}
                className="group flex min-h-12 flex-1 items-center gap-3 border-b border-white/40 pb-3 text-base font-bold transition hover:border-[#6FBF9E]"
              >
                <Mail size={19} aria-hidden="true" />
                <span>Email MyAvail</span>
              </a>
              <a
                href={`mailto:${contactEmail}`}
                onClick={() => trackIfConsented('contact_clicked', { location: 'footer_button' })}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-linear-to-r from-[#6FBF9E] to-[#4FA3C7] px-8 font-extrabold text-white shadow-[0_8px_24px_rgba(79,163,199,0.2)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(79,163,199,0.28)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4FA3C7]"
              >
                Contact us
                <ArrowUpRight size={18} aria-hidden="true" />
              </a>
            </div>
          </div>

          <nav aria-label="Footer product navigation">
            <h2 className="text-base font-black text-white">Explore</h2>
            <ul className="mt-3 space-y-0 text-sm text-white/78 tablet:mt-5 tablet:space-y-1">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="flex min-h-11 items-center transition hover:text-white hover:underline hover:underline-offset-4"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-base font-black text-white">Work with us</h2>
            <p className="mt-3 text-sm leading-6 text-white/78 tablet:mt-5">
              For gym partnerships, athlete collaborations, and press enquiries.
            </p>
            <a
              href={`mailto:${contactEmail}?subject=Partnership enquiry`}
              onClick={() => trackIfConsented('contact_clicked', { location: 'partnership' })}
              className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-white underline decoration-[#6FBF9E] decoration-2 underline-offset-4 transition hover:decoration-[#4FA3C7] tablet:mt-5"
            >
              Start a conversation
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="relative border-t border-white/15 bg-[#081B16]/55 backdrop-blur-sm">
          <div
            className={`${pageShell} flex flex-col gap-5 py-6 text-xs text-white/60 tablet:flex-row tablet:items-center tablet:justify-between`}
          >
            <p>© 2026 MyAvail. Built around female physiology.</p>
            <nav
              aria-label="Legal navigation"
              className="flex flex-wrap gap-x-5 gap-y-0"
            >
              <a
                href="/privacy"
                className="flex min-h-11 items-center transition hover:text-white hover:underline hover:underline-offset-4"
              >
                Privacy policy
              </a>
              <a
                href="/terms"
                className="flex min-h-11 items-center transition hover:text-white hover:underline hover:underline-offset-4"
              >
                Terms of service
              </a>
              <button
                type="button"
                onClick={() => setHasCookiePreference(false)}
                className="min-h-11 cursor-pointer transition hover:text-white hover:underline hover:underline-offset-4"
              >
                Cookie settings
              </button>
            </nav>
          </div>
        </div>
      </footer>

      {!hasCookiePreference && (
        <aside
          aria-labelledby="cookie-banner-title"
          className="fixed right-3 bottom-3 left-3 z-[90] mx-auto max-w-[1360px] rounded-2xl border border-black/10 bg-white px-4 py-3 text-[#1B1F23] shadow-[0_16px_50px_rgba(27,31,35,0.16)] tablet:right-8 tablet:bottom-6 tablet:left-8 tablet:px-6 tablet:py-5 air:right-12 air:left-12"
        >
          <div className="flex w-full flex-col gap-3 air:flex-row air:items-center air:justify-between air:gap-8">
            <div className="max-w-[660px]">
              <h2
                id="cookie-banner-title"
                className="type-feature-title font-black tracking-[-0.015em]"
              >
                Cookie settings
              </h2>
              <p className="type-caption mt-1 text-[#556166] tablet:text-sm">
                We use essential cookies to run the site and optional analytics to improve it.{" "}
                <a
                  href="/privacy#cookies"
                  className="font-bold text-[#2E7C9C] underline decoration-[#4FA3C7]/45 underline-offset-4 hover:decoration-[#2E7C9C]"
                >
                  Read the Privacy Policy
                </a>
              </p>
            </div>

            <div className="grid shrink-0 grid-cols-2 gap-2.5 tablet:flex tablet:items-center">
              <button
                type="button"
                onClick={() => storeCookiePreferences(false, false)}
                className="type-button min-h-11 cursor-pointer rounded-xl border border-black/14 bg-white px-5 font-extrabold whitespace-nowrap transition hover:border-black/30 hover:bg-[#F7FAF8]"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => storeCookiePreferences(true, true)}
                className="type-button min-h-11 cursor-pointer rounded-xl bg-linear-to-r from-[#6FBF9E] to-[#4FA3C7] px-6 font-extrabold whitespace-nowrap text-white shadow-[0_6px_20px_rgba(79,163,199,0.2)] transition hover:-translate-y-0.5 hover:shadow-[0_9px_24px_rgba(79,163,199,0.28)]"
              >
                Accept
              </button>
            </div>
          </div>
        </aside>
      )}

    </>
  );
}
