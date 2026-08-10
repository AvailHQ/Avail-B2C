import { pageShell } from './shared';

export function Footer() {
  return (
    <footer className={`${pageShell} flex flex-col items-center justify-center gap-4 border-t border-black/6 py-10 text-sm text-[#64707D] sm:flex-row sm:justify-between`}>
      <div>© 2026 Avail. Built on female physiology.</div>
      <div className="flex gap-8">
        <a href="/privacy" className="transition hover:text-[#1B1F23]">Privacy</a>
        <a href="/terms" className="transition hover:text-[#1B1F23]">Terms</a>
        <a href="mailto:myl520667@gmail.com" className="transition hover:text-[#1B1F23]">Contact</a>
      </div>
    </footer>
  );
}
