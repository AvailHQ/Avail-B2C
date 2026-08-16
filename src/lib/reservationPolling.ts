import { getReservationBySession, type ReservationLookup } from './convex';

// The webhook confirms payment a moment after Stripe redirects the payer here,
// so poll briefly for the record before falling back to the unverified state.
export const POLL_INTERVAL_MS = 1500;
export const MAX_ATTEMPTS = 10;

export interface ReservationPollHandlers {
  /** The reservation was verified as paid. */
  onPaid: (reservation: ReservationLookup) => void;
  /** Payment could not be verified from this page (never assert success here). */
  onUnverified: () => void;
}

export interface ReservationPollOptions {
  intervalMs?: number;
  maxAttempts?: number;
  /** Injectable for tests; defaults to the real Convex lookup. */
  lookup?: (sessionId: string) => Promise<ReservationLookup | null>;
}

/**
 * Poll for a confirmed reservation, returning a cancel function.
 *
 * Extracted from the component so the cancellation contract is testable: after
 * cancel, no handler fires and no further lookup is issued — including from a
 * retry that was already scheduled.
 */
export function pollReservation(
  sessionId: string,
  handlers: ReservationPollHandlers,
  options: ReservationPollOptions = {},
): () => void {
  const intervalMs = options.intervalMs ?? POLL_INTERVAL_MS;
  const maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS;
  const lookup = options.lookup ?? getReservationBySession;

  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let attempts = 0;

  const run = async () => {
    if (cancelled) return;
    attempts += 1;

    let result: ReservationLookup | null = null;
    let lookupFailed = false;
    try {
      result = await lookup(sessionId);
    } catch {
      // A hiccup is "not ready yet" and is retried below. This must stay
      // distinct from the `null` case, which is permanent.
      lookupFailed = true;
    }
    if (cancelled) return;

    if (!lookupFailed && result === null) {
      // Convex is not configured on this build; retrying cannot help.
      handlers.onUnverified();
      return;
    }

    if (result?.found && result.status === 'paid') {
      handlers.onPaid(result);
      return;
    }

    if (attempts >= maxAttempts) {
      handlers.onUnverified();
      return;
    }

    timer = setTimeout(run, intervalMs);
  };

  void run();

  return () => {
    cancelled = true;
    // Clear the queued retry too: the `cancelled` guard alone would still let a
    // pending timer fire one more lookup before bailing out.
    if (timer !== undefined) clearTimeout(timer);
  };
}
