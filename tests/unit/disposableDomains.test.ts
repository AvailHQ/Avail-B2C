import { describe, expect, it } from "vitest";
import { DISPOSABLE_DOMAINS } from "../../convex/disposableDomains";
import { isDisposableDomain } from "../../convex/emailValidation";

describe("disposable domain blocklist", () => {
  it("is the full community list, not a hand-written stub", () => {
    // The old hand-maintained set had ~30 entries and missed almost everything.
    expect(DISPOSABLE_DOMAINS.size).toBeGreaterThan(5000);
  });

  it("blocks well-known temporary mail providers", () => {
    for (const domain of [
      "mailinator.com",
      "10minutemail.com",
      "guerrillamail.com",
      "yopmail.com",
      "sharklasers.com",
      "trashmail.com",
      "temp-mail.org",
    ]) {
      expect(isDisposableDomain(`someone@${domain}`), domain).toBe(true);
    }
  });

  it("never blocks real mailbox providers", () => {
    for (const domain of [
      "gmail.com",
      "googlemail.com",
      "outlook.com",
      "hotmail.com",
      "yahoo.com",
      "icloud.com",
      "proton.me",
      "protonmail.com",
      "aol.com",
    ]) {
      expect(isDisposableDomain(`someone@${domain}`), domain).toBe(false);
    }
  });

  it("matches case-insensitively and ignores surrounding space", () => {
    expect(isDisposableDomain("  Someone@MAILINATOR.com  ")).toBe(true);
  });

  it("contains no entries with an @ or whitespace", () => {
    const malformed = [...DISPOSABLE_DOMAINS].filter((d) => /[@\s]/.test(d) || d.length === 0);
    expect(malformed).toEqual([]);
  });

  it("does not block a made-up mailbox at a real provider (known limitation)", () => {
    // Documents the gap this list does NOT close: a fabricated address at a real
    // domain passes every blocklist. Catching that needs bounce handling.
    expect(isDisposableDomain("asdfgh123456@gmail.com")).toBe(false);
  });
});
