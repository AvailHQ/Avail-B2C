import { useEffect, useState } from 'react';
import { CircleAlert, CheckCircle2, Loader2 } from 'lucide-react';
import { Header } from '../components/landing/Header';
import { Footer } from '../components/landing/Footer';
import { pageShell, primaryButtonClass } from '../components/landing/shared';
import { pollReservation } from '../lib/reservationPolling';

type LookupState =
  | { phase: 'idle' }
  | { phase: 'confirming' }
  | {
      phase: 'paid';
      email?: string;
      name?: string;
      confirmationEmailSent: boolean;
    }
  | { phase: 'unverified' };

export function SuccessPage() {
  const [state, setState] = useState<LookupState>({ phase: 'idle' });

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get('session_id');

    // Without a session id we cannot verify payment from this page. Payment
    // processing remains webhook-driven and never depends on this page.
    if (!sessionId) {
      setState({ phase: 'unverified' });
      return;
    }

    setState({ phase: 'confirming' });

    return pollReservation(sessionId, {
      onPaid: (reservation) =>
        setState({
          phase: 'paid',
          email: reservation.email,
          name: reservation.name,
          confirmationEmailSent: reservation.confirmationEmailSent === true,
        }),
      onUnverified: () => setState({ phase: 'unverified' }),
    });
  }, []);

  const firstName =
    state.phase === 'paid' && state.name ? state.name.split(' ')[0] : null;

  return (
    <div className="relative flex min-h-screen flex-col bg-[#F7FAF8] text-[#1B1F23]">
      <Header />

      <main className={`${pageShell} flex flex-1 items-start justify-center py-20`}>
        <div className="mx-auto flex w-full max-w-[560px] flex-col items-center text-center">
          {state.phase === 'confirming' || state.phase === 'idle' ? (
            <div key="confirming" className="fade-up flex w-full flex-col items-center gap-6">
              <div className="flex size-[76px] items-center justify-center rounded-full bg-linear-to-br from-[#6FBF9E]/15 to-[#4FA3C7]/15 text-[#4FA3C7]">
                <Loader2 size={44} className="animate-spin" />
              </div>
              <h1 className="type-page-title font-black text-[#17333A]">
                Confirming your reservation&hellip;
              </h1>
              <p className="type-body text-[#64707D]">
                We&rsquo;re checking your reservation with our payment provider. This
                only takes a moment.
              </p>
            </div>
          ) : state.phase === 'paid' ? (
            <div key="paid" className="fade-up flex w-full flex-col items-center gap-6">
              <div className="flex size-[76px] items-center justify-center rounded-full bg-linear-to-br from-[#6FBF9E]/15 to-[#4FA3C7]/15 text-[#6FBF9E]">
                <CheckCircle2 size={44} />
              </div>

              <h1 className="type-page-title font-black text-[#17333A]">
                {firstName ? `You’re in, ${firstName}.` : 'You’re in.'}
              </h1>

              <p className="type-lead text-[#4F5B60]">
                Your &pound;5 Founding Waitlist reservation is confirmed. You&rsquo;ll receive
                priority consideration for early access and be among the first to hear
                about launch updates.
              </p>

              <p className="type-body text-[#64707D]">
                {state.confirmationEmailSent && state.email ? (
                  <>
                    We&rsquo;ve sent a confirmation to{' '}
                    <strong className="font-bold text-[#17333A]">{state.email}</strong>. When
                    launch approaches, we&rsquo;ll send updates and the next steps for early
                    access.
                  </>
                ) : (
                  <>
                    We&rsquo;ll email you when your confirmation is ready, followed by launch
                    updates and the next steps for early access.
                  </>
                )}
              </p>

              <a href="/" className={primaryButtonClass}>
                Back to Avail
              </a>
            </div>
          ) : (
            <div key="unverified" className="fade-up flex w-full flex-col items-center gap-6">
              <div className="flex size-[76px] items-center justify-center rounded-full bg-linear-to-br from-[#6FBF9E]/15 to-[#4FA3C7]/15 text-[#4FA3C7]">
                <CircleAlert size={44} />
              </div>

              <h1 className="type-page-title font-black text-[#17333A]">
                Thanks &mdash; we&rsquo;re checking your reservation.
              </h1>

              <p className="type-lead text-[#4F5B60]">
                We couldn&rsquo;t verify the payment from this page. If you completed checkout,
                your payment is still recorded securely by Stripe and we&rsquo;ll email you once
                it has been confirmed.
              </p>

              <p className="type-body text-[#64707D]">
                Please keep your Stripe receipt. If you don&rsquo;t receive confirmation, contact
                us and we&rsquo;ll check it for you.
              </p>

              <a href="/" className={primaryButtonClass}>
                Back to Avail
              </a>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
