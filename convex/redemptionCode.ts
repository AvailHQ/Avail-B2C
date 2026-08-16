export const REDEMPTION_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const REDEMPTION_CODE_LENGTH = 16;
const MAX_RANDOM_BYTE = 256 - (256 % REDEMPTION_ALPHABET.length);

/** Generate one code from Web Crypto without modulo bias. */
export function generateSecureRedemptionCode(
  getRandomValues: (
    array: Uint8Array<ArrayBuffer>,
  ) => Uint8Array<ArrayBuffer> = (array) =>
    crypto.getRandomValues(array),
): string {
  let code = "";
  while (code.length < REDEMPTION_CODE_LENGTH) {
    const bytes = getRandomValues(new Uint8Array(REDEMPTION_CODE_LENGTH * 2));
    for (const byte of bytes) {
      if (byte >= MAX_RANDOM_BYTE) continue;
      code += REDEMPTION_ALPHABET[byte % REDEMPTION_ALPHABET.length];
      if (code.length === REDEMPTION_CODE_LENGTH) break;
    }
  }
  return code;
}

export function generateRedemptionCodeCandidates(count = 10): string[] {
  return Array.from({ length: count }, () => generateSecureRedemptionCode());
}

export function isValidRedemptionCode(code: string): boolean {
  return (
    code.length === REDEMPTION_CODE_LENGTH &&
    Array.from(code).every((character) => REDEMPTION_ALPHABET.includes(character))
  );
}
