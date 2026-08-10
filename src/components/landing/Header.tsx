export function Header() {
  return (
    <header className="fixed top-0 right-0 left-0 z-50 bg-[#F7FAF8]/75 backdrop-blur-xl">
      <nav className="mx-auto flex w-full max-w-[1960px] items-center justify-between px-6 py-5 sm:px-10 2xl:px-[clamp(2.5rem,11.71875vw,300px)]">
        <a href="/" className="flex items-center gap-3">
          <img src="/logo.svg" alt="Avail" className="block h-[42px] w-[87px]" />
          <span className="text-2xl font-extrabold tracking-normal text-[#1B1F23]">MyAvail</span>
        </a>

        <a
          href="/#early-access"
          className="inline-flex h-11 items-center justify-center rounded-full bg-linear-to-r from-[#6FBF9E] to-[#4FA3C7] px-5 text-sm font-extrabold text-white shadow-[0_4px_16px_rgba(111,191,158,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(111,191,158,0.32)]"
        >
          Reserve Early Access
        </a>
      </nav>
    </header>
  );
}
