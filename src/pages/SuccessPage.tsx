import { CheckCircle2 } from 'lucide-react';
import { Header } from '../components/landing/Header';
import { Footer } from '../components/landing/Footer';
import { pageShell, primaryButtonClass } from '../components/landing/shared';

export function SuccessPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-[#F7FAF8] text-[#1B1F23]">
      <Header />

      <main className={`${pageShell} flex flex-1 items-center justify-center py-20`}>
        <div className="mx-auto flex max-w-[560px] flex-col items-center gap-6 text-center">
          <div className="flex size-[76px] items-center justify-center rounded-full bg-linear-to-br from-[#6FBF9E]/15 to-[#4FA3C7]/15 text-[#6FBF9E]">
            <CheckCircle2 size={44} />
          </div>

          <h1 className="type-page-title font-black text-[#17333A]">You&rsquo;re in.</h1>

          <p className="type-lead text-[#4F5B60]">
            Your &pound;10 early access reservation is confirmed &mdash; two months of Avail and a
            founding place at the front of the queue.
          </p>

          <p className="type-body text-[#64707D]">
            We&rsquo;ve sent a confirmation to your email. When the app launches, we&rsquo;ll send
            everything you need to activate your access. Nothing else to do for now.
          </p>

          <a href="/" className={primaryButtonClass}>
            Back to Avail
          </a>
        </div>
      </main>

      <Footer />
    </div>
  );
}
