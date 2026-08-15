import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Header } from '../components/landing/Header';
import { Footer } from '../components/landing/Footer';
import { pageShell, primaryButtonClass } from '../components/landing/shared';
import { getReservationBySession, type ReservationLookup } from '../lib/convex';

// The webhook confirms payment a moment after Stripe redirects the payer here,
// so poll briefly for the record before falling back to a generic confirmation.
const POLL_INTERVAL_MS = 1500;
const MAX_ATTEMPTS = 10;

type LookupState =
  | { phase: 'idle' }
  | { phase: 'confirming' }
  | { phase: 'paid'; email?: string; name?: string; redemptionCode?: string }
  | { phase: 'fallback' };

export function SuccessPage() {
  const [state, setState] = useState<LookupState>({ phase: 'idle' });

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get('session_id');

    // No session id (or Convex not configured): show the generic confirmation.
    // The payment is recorded by the webhook regardless of this page.
    if (!sessionId) {
      setState({ phase: 'fallback' });
      return;
    }

    let cancelled = false;
    let attempts = 0;
    setState({ phase: 'confirming' });

    const poll = async () => {
      attempts += 1;
      let result: ReservationLookup | null = null;
      try {
        result = await getReservationBySession(sessionId);
      } catch {
        // Network hiccup — treated like "not ready yet" and retried below.
      }
      if (cancelled) return;

      if (result === null) {
        // Convex not configured on this build.
        setState({ phase: 'fallback' });
        return;
      }

      if (result.found && result.status === 'paid') {
        setState({
          phase: 'paid',
          email: result.email,
          name: result.name,
          redemptionCode: result.redemptionCode,
        });
        return;
      }

      if (attempts >= MAX_ATTEMPTS) {
        setState({ phase: 'fallback' });
        return;
      }

      window.setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();

    return () => {
      cancelled = true;
    };
  }, []);

  const firstName =
    state.phase === 'paid' && state.name ? state.name.split(' ')[0] : null;

  return (
    <div className="relative flex min-h-screen flex-col bg-[#F7FAF8] text-[#1B1F23]">
      <Header />

      <main className={`${pageShell} flex flex-1 items-center justify-center py-20`}>
        <div className="mx-auto flex max-w-[560px] flex-col items-center gap-6 text-center">
          {state.phase === 'confirming' || state.phase === 'idle' ? (
            <>
              <div className="flex size-[76px] items-center justify-center rounded-full bg-linear-to-br from-[#6FBF9E]/15 to-[#4FA3C7]/15 text-[#4FA3C7]">
                <Loader2 size={44} className="animate-spin" />
              </div>
              <h1 className="type-page-title font-black text-[#17333A]">
                Confirming your reservation&hellip;
              </h1>
              <p className="type-body text-[#64707D]">
                Your payment went through &mdash; we&rsquo;re just finishing up. This
                only takes a moment.
              </p>
            </>
          ) : (
            <>
              <div className="flex size-[76px] items-center justify-center rounded-full bg-linear-to-br from-[#6FBF9E]/15 to-[#4FA3C7]/15 text-[#6FBF9E]">
                <CheckCircle2 size={44} />
              </div>

              <h1 className="type-page-title font-black text-[#17333A]">
                {firstName ? `You’re in, ${firstName}.` : 'You’re in.'}
              </h1>

              <p className="type-lead text-[#4F5B60]">
                Your &pound;10 early access reservation is confirmed &mdash; two months of
                Avail and a founding place at the front of the queue.
              </p>

              {state.phase === 'paid' && state.redemptionCode && (
                <div className="w-full rounded-2xl border border-[#17333A]/12 bg-white/70 px-6 py-5">
                  <p className="type-caption font-extrabold tracking-[0.6px] text-[#64707D] uppercase">
                    Your early access code
                  </p>
                  <p className="type-feature-title mt-2 font-black tracking-[0.15em] text-[#17333A] tabular-nums">
                    {state.redemptionCode}
                  </p>
                  <p className="type-caption mt-2 text-[#64707D]">
                    Keep this safe &mdash; you&rsquo;ll use it to activate your access when
                    Avail launches.
                  </p>
                </div>
              )}

              <p className="type-body text-[#64707D]">
                {state.phase === 'paid' && state.email ? (
                  <>
                    We&rsquo;ve sent a confirmation to{' '}
                    <strong className="font-bold text-[#17333A]">{state.email}</strong>. When
                    the app launches, we&rsquo;ll send everything you need to activate your
                    access.
                  </>
                ) : (
                  <>
                    We&rsquo;ve sent a confirmation to your email. When the app launches,
                    we&rsquo;ll send everything you need to activate your access. Nothing else
                    to do for now.
                  </>
                )}
              </p>

              <a href="/" className={primaryButtonClass}>
                Back to Avail
              </a>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
