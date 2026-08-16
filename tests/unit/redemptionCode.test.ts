import { describe, expect, it } from "vitest";
import {
  generateSecureRedemptionCode,
  isValidRedemptionCode,
  REDEMPTION_ALPHABET,
  REDEMPTION_CODE_LENGTH,
} from "../../convex/redemptionCode";

describe("secure redemption codes", () => {
  it("uses the approved alphabet and length", () => {
    let offset = 0;
    const code = generateSecureRedemptionCode((array) => {
      for (let index = 0; index < array.length; index++) {
        array[index] = (offset + index) % 224;
      }
      offset += array.length;
      return array;
    });

    expect(code).toHaveLength(REDEMPTION_CODE_LENGTH);
    expect(isValidRedemptionCode(code)).toBe(true);
    expect(Array.from(code).every((character) => REDEMPTION_ALPHABET.includes(character))).toBe(
      true,
    );
  });

  it("rejects ambiguous, malformed, and incorrectly sized candidates", () => {
    expect(isValidRedemptionCode("O".repeat(REDEMPTION_CODE_LENGTH))).toBe(false);
    expect(isValidRedemptionCode("A".repeat(REDEMPTION_CODE_LENGTH - 1))).toBe(false);
    expect(isValidRedemptionCode("A".repeat(REDEMPTION_CODE_LENGTH))).toBe(true);
  });

  it("uses Web Crypto by default and does not repeat in a practical sample", () => {
    const codes = new Set(
      Array.from({ length: 100 }, () => generateSecureRedemptionCode()),
    );
    expect(codes.size).toBe(100);
  });
});
