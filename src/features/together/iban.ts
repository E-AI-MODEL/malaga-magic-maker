/** Normalises an IBAN: uppercase, no spaces. Empty string stays empty. */
export function normalizeIban(input: string): string {
  return input.replace(/\s+/g, "").toUpperCase();
}

/** ISO 7064 mod-97 check. Accepts a formatted IBAN (spaces allowed). */
export function isValidIban(input: string): boolean {
  const iban = normalizeIban(input);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  const reordered = iban.slice(4) + iban.slice(0, 4);
  const digits = reordered.replace(/[A-Z]/g, (char) => String(char.charCodeAt(0) - 55));
  let remainder = 0;
  for (const char of digits) {
    remainder = (remainder * 10 + Number(char)) % 97;
  }
  return remainder === 1;
}

/** IBAN in groups of four, for display only. */
export function formatIban(iban: string): string {
  return normalizeIban(iban).replace(/(.{4})(?=.)/g, "$1 ");
}
