import { describe, expect, it, vi } from "vitest";
import { pollReservation } from "../../src/lib/reservationPolling";
import type { ReservationLookup } from "../../src/lib/convex";

const paid: ReservationLookup = {
  found: true,
  status: "paid",
  name: "Robin Fields",
  email: "robin@example.com",
  redemptionCode: "ABCD2345EFGH6789",
  confirmationEmailSent: true,
};

const tick = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

function handlers() {
  return { onPaid: vi.fn(), onUnverified: vi.fn() };
}

const fast = { intervalMs: 1, maxAttempts: 3 };

describe("pollReservation", () => {
  it("reports a paid reservation and stops polling", async () => {
    const h = handlers();
    const lookup = vi.fn(async () => paid);

    pollReservation("cs_1", h, { ...fast, lookup });
    await tick();

    expect(h.onPaid).toHaveBeenCalledWith(paid);
    expect(h.onUnverified).not.toHaveBeenCalled();
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it("retries a transient failure instead of giving up", async () => {
    const h = handlers();
    const lookup = vi
      .fn<(id: string) => Promise<ReservationLookup | null>>()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValue(paid);

    pollReservation("cs_1", h, { ...fast, lookup });
    await tick(30);

    expect(h.onPaid).toHaveBeenCalledWith(paid);
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it("gives up as unverified after the attempt budget", async () => {
    const h = handlers();
    const lookup = vi.fn(async () => ({ found: false }) as ReservationLookup);

    pollReservation("cs_1", h, { ...fast, lookup });
    await tick(40);

    expect(h.onUnverified).toHaveBeenCalledTimes(1);
    expect(h.onPaid).not.toHaveBeenCalled();
    expect(lookup).toHaveBeenCalledTimes(fast.maxAttempts);
  });

  it("treats a null lookup (Convex not configured) as permanent, without retrying", async () => {
    const h = handlers();
    const lookup = vi.fn(async () => null);

    pollReservation("cs_1", h, { ...fast, lookup });
    await tick(30);

    expect(h.onUnverified).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalledTimes(1); // no retry
  });

  it("never reports success for a reservation that is not paid", async () => {
    const h = handlers();
    const lookup = vi.fn(
      async () => ({ found: true, status: "refunded" }) as ReservationLookup,
    );

    pollReservation("cs_1", h, { ...fast, lookup });
    await tick(40);

    expect(h.onPaid).not.toHaveBeenCalled();
    expect(h.onUnverified).toHaveBeenCalledTimes(1);
  });

  describe("UI-07 — cancellation (component unmount)", () => {
    it("stops the queued retry: no further lookups after cancel", async () => {
      const h = handlers();
      const lookup = vi.fn(async () => ({ found: false }) as ReservationLookup);

      const cancel = pollReservation("cs_1", h, { intervalMs: 20, maxAttempts: 10, lookup });
      await tick(5); // first lookup done, retry queued
      const callsAtCancel = lookup.mock.calls.length;
      cancel();

      await tick(80); // several intervals pass

      expect(lookup).toHaveBeenCalledTimes(callsAtCancel);
      expect(h.onPaid).not.toHaveBeenCalled();
      expect(h.onUnverified).not.toHaveBeenCalled();
    });

    it("does not report a result that arrives after cancel", async () => {
      const h = handlers();
      let release: (value: ReservationLookup) => void = () => {};
      const lookup = vi.fn(
        () => new Promise<ReservationLookup>((resolve) => (release = resolve)),
      );

      const cancel = pollReservation("cs_1", h, { ...fast, lookup });
      await tick(); // in flight
      cancel();
      release(paid); // late response
      await tick();

      expect(h.onPaid).not.toHaveBeenCalled();
      expect(h.onUnverified).not.toHaveBeenCalled();
    });
  });
});
